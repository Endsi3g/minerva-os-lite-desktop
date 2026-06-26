import { streamText } from 'ai'

const result = streamText({
  model: 'openai/gpt-5.4',
  prompt: 'Explain quantum computing in simple terms.',
})

let totalTokens = 0

for await (const chunk of result.textStream) {
  process.stdout.write(chunk)
}

const usage = await result.usage
console.log('\n\n---')
console.log(`Tokens — prompt: ${usage.promptTokens}, completion: ${usage.completionTokens}, total: ${usage.totalTokens}`)
