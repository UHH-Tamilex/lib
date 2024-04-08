import { createDbWorker } from './sqljs-httpvfs.mjs';

const sqlWorker = async (url) => {
    const workerUrl = new URL('./sqlite.worker.js',import.meta.url);
    const wasmUrl = new URL('./sql-wasm.wasm',import.meta.url);
    const sqlConfig = {
        from: 'inline',
        config: {
            serverMode: 'full',
            requestChunkSize: 4096,
            url: url
        }
    };
    const worker = await createDbWorker(
        [sqlConfig],
        workerUrl.toString(),
        wasmUrl.toString(),
        10 * 1024 * 1024
    );

    return worker;
};

export default sqlWorker;
