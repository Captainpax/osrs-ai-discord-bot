import os from 'os';
import axios from 'axios';
import util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

/**
 * @module HealthUtils
 * @description Helpers for building health reports and dependency checks.
 */

/**
 * @description Formats a Date into PST (America/Los_Angeles).
 * @param {Date} [date] - Date instance to format.
 * @returns {string} PST timestamp string.
 */
export function formatPst(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        dateStyle: 'medium',
        timeStyle: 'long',
        hour12: false
    }).format(date);
}

/**
 * @description Derives the n8n health endpoint from a webhook URL.
 * @param {string} webhookUrl - Full webhook URL.
 * @returns {string|null} Health URL or null if not configured.
 */
export function deriveN8nHealthUrl(webhookUrl) {
    if (!webhookUrl) return null;
    const base = webhookUrl.includes('/webhook/') ? webhookUrl.split('/webhook/')[0] : webhookUrl.replace(/\/$/, '');
    return `${base}/healthz`;
}

/**
 * @description Derives the LocalAI health endpoint from a base URL.
 * @param {string} aiBaseUrl - LocalAI base URL.
 * @returns {string|null} Health URL or null if not configured.
 */
export function deriveLocalAiHealthUrl(aiBaseUrl) {
    if (!aiBaseUrl) return null;
    const base = aiBaseUrl.replace(/\/v1\/?$/, '');
    return `${base}/readyz`;
}

async function collectGpuMetrics() {
    try {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits', { timeout: 1200 });
        const rows = stdout.trim().split('\n').filter(Boolean);
        return {
            available: true,
            gpus: rows.map((row, idx) => {
                const [utilStr, memUsedStr, memTotalStr] = row.split(',').map(s => s.trim());
                const memoryUsed = Number(memUsedStr);
                const memoryTotal = Number(memTotalStr);
                return {
                    id: idx,
                    utilizationPercent: Number(utilStr),
                    memoryUsed,
                    memoryTotal,
                    memoryPercent: memoryTotal ? Number((memoryUsed / memoryTotal * 100).toFixed(2)) : null
                };
            })
        };
    } catch (err) {
        return { available: false, error: err.message };
    }
}

function collectSystemMetrics() {
    const now = new Date();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const processMem = process.memoryUsage();
    const cpus = os.cpus();
    const cpuTimes = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((sum, val) => sum + val, 0);
        return {
            idle: acc.idle + cpu.times.idle,
            total: acc.total + total
        };
    }, { idle: 0, total: 0 });
    const cpuUsagePercent = cpuTimes.total
        ? Number(((1 - cpuTimes.idle / cpuTimes.total) * 100).toFixed(2))
        : 0;

    return {
        hostname: os.hostname(),
        timeUTC: now.toISOString(),
        timePST: formatPst(now),
        timezone: 'America/Los_Angeles',
        uptimeSeconds: os.uptime(),
        processUptimeSeconds: process.uptime(),
        load: os.loadavg(),
        memory: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            usedPercent: Number((usedMem / totalMem * 100).toFixed(2))
        },
        processMemory: {
            rss: processMem.rss,
            heapTotal: processMem.heapTotal,
            heapUsed: processMem.heapUsed
        },
        cpu: {
            usagePercent: cpuUsagePercent,
            model: cpus[0]?.model || 'unknown',
            speedMHz: cpus[0]?.speed || null
        },
        cpuCount: cpus.length,
        platform: os.platform(),
        arch: os.arch()
    };
}

async function runHttpCheck(dep) {
    const { name, url, method = 'get', timeoutMs = 3000, skipIfMissing } = dep;
    if (!url && skipIfMissing) {
        return { name, status: 'SKIPPED', ok: true, message: 'Skipped (not configured)' };
    }
    if (!url) {
        return { name, status: 'DOWN', ok: false, error: 'URL not configured' };
    }
    const started = Date.now();
    try {
        const res = await axios.request({ url, method, timeout: timeoutMs });
        const latencyMs = Date.now() - started;
        return {
            name,
            status: res.status >= 200 && res.status < 400 ? 'UP' : 'WARN',
            ok: res.status >= 200 && res.status < 400,
            code: res.status,
            latencyMs,
            url,
            data: res.data
        };
    } catch (err) {
        const latencyMs = Date.now() - started;
        return {
            name,
            status: 'DOWN',
            ok: false,
            latencyMs,
            code: err.response?.status,
            url,
            error: err.message,
            data: err.response?.data
        };
    }
}

async function runFunctionCheck(dep) {
    const { name, checkFn, statusFromResult } = dep;
    const started = Date.now();
    if (!checkFn) {
        return { name, status: 'UNKNOWN', ok: false, error: 'No checkFn provided' };
    }
    try {
        const result = await checkFn();
        const status = statusFromResult ? statusFromResult(result) : (result?.online === false ? 'DOWN' : 'UP');
        return {
            name,
            status,
            ok: status === 'UP',
            latencyMs: Date.now() - started,
            data: result
        };
    } catch (err) {
        return {
            name,
            status: 'DOWN',
            ok: false,
            latencyMs: Date.now() - started,
            error: err.message
        };
    }
}

function deriveOverallStatus(checks) {
    if (checks.some(c => c.status === 'DOWN')) return 'DOWN';
    if (checks.some(c => c.status === 'WARN')) return 'WARN';
    return 'UP';
}

/**
 * @description Builds a full health report for the current service and dependencies.
 * @param {object} options - Report options.
 * @param {string} options.serviceName - Name of the current service.
 * @param {string} [options.version] - Service version string.
 * @param {Array<object>} [options.dependencies] - Dependency checks.
 * @param {object} [options.extras] - Extra metadata to include.
 * @returns {Promise<object>} Health report object.
 */
export async function buildHealthReport({ serviceName, version, dependencies = [], extras = {} }) {
    const system = collectSystemMetrics();
    
    // Run GPU metrics collection and dependency checks in parallel
    const [gpu, services] = await Promise.all([
        collectGpuMetrics(),
        Promise.all(dependencies.map(async (dep) => {
            if (dep.type === 'http') {
                return runHttpCheck(dep);
            }
            return runFunctionCheck(dep);
        }))
    ]);

    const status = deriveOverallStatus(services);
    const errors = services.filter(s => !s.ok);

    return {
        service: serviceName,
        version,
        status,
        timestamp: system.timeUTC,
        timePST: system.timePST,
        hostname: system.hostname,
        system,
        gpu,
        services,
        errors,
        extras
    };
}

export default {
    buildHealthReport,
    deriveLocalAiHealthUrl,
    deriveN8nHealthUrl,
    formatPst
};
