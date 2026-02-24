export type WorkerMessage = {
  type: 'log' | 'error'
  message: string
}

export type WorkerType = 'buildNpm' | 'buildPypi' | 'buildGithub'

function getWorker(workerType: WorkerType): Worker {
  switch (workerType) {
    case 'buildNpm':
      return new Worker(new URL('./buildNpmPackage.js', import.meta.url).href, {
        type: 'module',
      })
    case 'buildPypi':
      return new Worker(new URL('./buildPypiPackage.ts', import.meta.url).href)
    case 'buildGithub':
      return new Worker(
        new URL('./buildGithubArchives.ts', import.meta.url).href,
      )
  }
}

export async function runWorker(
  workerType: WorkerType,
  message: Record<string, unknown>,
): Promise<number> {
  return new Promise((resolve) => {
    try {
      const worker = getWorker(workerType)

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
