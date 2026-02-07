import os from 'os';
import axios from 'axios';
import util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

export function formatPst(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Los_Angeles',
        dateStyle: 'medium',
        timeStyle: 'long',
        hour12: false
    }).format(date);
}

export function deriveN8nHealthUrl(webhookUrl) {
    if (!webhookUrl) return null;
    const base = webhookUrl.includes('/webhook/') ? webhookUrl.split('/webhook/')[0] : webhookUrl.replace(/\/$/, '');
    return `${base}/healthz`;
}

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
        cpuCount: os.cpus().length,
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

export async function buildHealthReport({ serviceName, version, dependencies = [], extras = {} }) {
    const system = collectSystemMetrics();
    const gpu = await collectGpuMetrics();

    const services = [];
    for (const dep of dependencies) {
        if (dep.type === 'http') {
            services.push(await runHttpCheck(dep));
            continue;
        }
        services.push(await runFunctionCheck(dep));
    }

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
