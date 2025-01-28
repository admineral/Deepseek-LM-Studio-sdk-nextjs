import Image from "next/image";
import { CodeBlock } from "@/components/CodeBlock";
import Link from "next/link";

const quickStartCode = `import { LMStudioClient } from "@lmstudio/sdk";

const client = new LMStudioClient();

async function main() {
  const modelPath = "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF";
  const llama3 = await client.llm.load(modelPath);
  const prediction = llama3.respond([
    { role: "system", content: "Always answer in rhymes." },
    { role: "user", content: "Please introduce yourself." },
  ]);

  for await (const { content } of prediction) {
    process.stdout.write(content);
  }
}`;

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="relative w-16 h-16 bg-blue-600 rounded-lg shadow-lg transform rotate-45">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center -rotate-45">
                <span className="text-2xl font-bold text-white">LM</span>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            <span className="block">LM Studio</span>
            <span className="block text-blue-600">JavaScript SDK</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Use local LLMs in JavaScript, TypeScript, and Node.js with ease. Pre-release alpha version available now.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8 gap-4">
            <div className="rounded-md shadow">
              <a href="https://www.npmjs.com/package/@lmstudio/sdk" className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10">
                npm install @lmstudio/sdk
              </a>
            </div>
            <div className="mt-3 sm:mt-0">
              <Link href="/chat-v2" className="w-full flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 md:py-4 md:text-lg md:px-10">
                Try Chat Demo →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Easy Integration</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Simple API for loading and using local LLMs in your JavaScript applications.</p>
          </div>
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Local First</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Run AI models locally with high performance and complete privacy.</p>
          </div>
          <div className="relative rounded-2xl border border-gray-200 dark:border-gray-800 p-8 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TypeScript Ready</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Full TypeScript support with type definitions and intelligent autocompletion.</p>
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="p-6 overflow-x-auto">
            <pre className="text-sm text-gray-300">
              <code>{quickStartCode}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 dark:text-gray-400">
          <a href="https://github.com/lmstudio-ai/lmstudio-js" className="hover:text-blue-600 dark:hover:text-blue-400">GitHub</a>
          <a href="https://discord.gg/lmstudio" className="hover:text-blue-600 dark:hover:text-blue-400">Discord</a>
          <a href="https://twitter.com/lmstudio_ai" className="hover:text-blue-600 dark:hover:text-blue-400">Twitter</a>
          <a href="https://lmstudio.ai/docs/sdk" className="hover:text-blue-600 dark:hover:text-blue-400">Documentation</a>
        </div>
      </footer>
    </div>
  );
}
