// Fails fast at startup if the configuration is unusable, instead of failing on the first request.
// Only variable NAMES are reported, never their values.
const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'JWT_SECRET']
const placeholderSecrets = ['replace_with_a_long_random_secret', 'changeme', 'secret']

function validateEnv() {
  const problems = []

  for (const name of required) {
    if (!process.env[name]) problems.push(`${name} is missing`)
  }

  if (process.env.DB_PASSWORD === undefined) problems.push('DB_PASSWORD is missing')

  const secret = process.env.JWT_SECRET
  if (secret && (secret.length < 32 || placeholderSecrets.includes(secret))) {
    problems.push('JWT_SECRET must be a random string of at least 32 characters')
  }

  if (problems.length > 0) {
    console.error(`Invalid backend configuration (check backend/.env): ${problems.join('; ')}.`)
    process.exit(1)
  }
}

module.exports = validateEnv
