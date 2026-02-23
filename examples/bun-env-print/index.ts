const environmentVariableName = process.argv[2]

if (!environmentVariableName) {
  console.error('Please provide the name of the environment variable to print.')
  process.exit(1)
}

const value = process.env[environmentVariableName]

if (value === undefined) {
  console.error(`Environment variable "${environmentVariableName}" is not set.`)
  process.exit(1)
}

console.log(value)
