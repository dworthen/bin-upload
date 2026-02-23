export type WorkerMessage = {
  type: 'log' | 'error'
  message: string
}

export async function runWorker(
  workerUrl: string,
  message: Record<string, unknown>,
): Promise<number> {
  return new Promise((resolve) => {
    try {
      const worker = new Worker(workerUrl)

      worker.addEventListener('message', (event: { data: WorkerMessage }) => {
        const { type, message } = event.data
        if (type === 'log') {
          console.log(message)
        } else if (type === 'error') {
          console.error(message)
        }
      })

      worker.addEventListener('close', (event) => {
        resolve(event.code)
      })

      worker.postMessage(message)
    } catch (error) {
      console.error(`Failed to start worker: ${error}`)
      resolve(1)
    }
  })
}
