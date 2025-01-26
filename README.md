README
Apache-2.0 license
lmstudio javascript library logo

Use local LLMs in JS/TS/Node

LM Studio Client SDK - Pre-Release

Pre-Release Alpha
lmstudio.js is in pre-release alpha, and is undergoing rapid and continuous development. Expect breaking changes!

Follow along for our upcoming announcements about lmstudio.js on Twitter and Discord. Read the Docs.

Discuss all things lmstudio.js in #dev-chat in LM Studio's Community Discord server.

Discord
Installation
npm install @lmstudio/sdk
Quick project setup
npx lmstudio install-cli # open a new terminal window after installation...
lms create
API Usage
import { LMStudioClient } from "@lmstudio/sdk";

const client = new LMStudioClient();

async function main() {
  const modelPath = "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF";
  const llama3 = await client.llm.load(modelPath, { config: { gpuOffload: "max" } });
  const prediction = llama3.respond([
    { role: "system", content: "Always answer in rhymes." },
    { role: "user", content: "Please introduce yourself." },
  ]);

  for await (const { content } of prediction) {
    process.stdout.write(content);
  }

  const { stats } = await prediction;
  console.log(stats);
}

main();
Getting Started
Set up lms (CLI)
lms is the CLI tool for LM Studio. It is shipped with the latest versions of LM Studio. To set it up, run:

npx lmstudio install-cli
To check if the bootstrapping was successful, run the following in a 👉 new terminal window 👈:

lms
Note

lms is only shipped with the latest version of LM Studio (v0.2.22 and onwards). Please make sure you have the latest version installed.

Start the local LLM server
Node.js script
Start the server by running:

lms server start
Web app
If you are developing a web application and/or need to enable CORS (Cross Origin Resource Sharing), run this instead:

lms server start --cors=true
Override the default port
lms server start --port 12345
Examples
Loading an LLM and Predicting with It
This example loads a model "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF" and predicts text with it.

import { LMStudioClient } from "@lmstudio/sdk";

const client = new LMStudioClient();

// Load a model
const llama3 = await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF");

// Create a text completion prediction
const prediction = llama3.complete("The meaning of life is");

// Stream the response
for await (const { content } of prediction) {
  process.stdout.write(content);
}
Note

About process.stdout.write

process.stdout.write is a Node.js-specific function that allows you to print text without a newline.

On the browser, you might want to do something like:

// Get the element where you want to display the output
const outputElement = document.getElementById("output");

for await (const { content } of prediction) {
  outputElement.textContent += content;
}
Using a Non-Default LM Studio Server Port
This example shows how to connect to LM Studio running on a different port (e.g., 8080).

import { LMStudioClient } from "@lmstudio/sdk";

const client = new LMStudioClient({
  baseUrl: "ws://127.0.0.1:8080",
});

// client.llm.load(...);
Loading a Model and Keeping It Loaded After Client Exit (daemon mode)
By default, when your client disconnects from LM Studio, all models loaded by that client are unloaded. You can prevent this by setting the noHup option to true.

await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
  noHup: true,
});

// The model stays loaded even after the client disconnects
Giving a Loaded Model a Friendly Name
You can set an identifier for a model when loading it. This identifier can be used to refer to the model later.

await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
  identifier: "my-model",
});

// You can refer to the model later using the identifier
const myModel = await client.llm.get("my-model");
// myModel.complete(...);
Loading a Model with a Custom Configuration
By default, the load configuration for a model comes from the preset associated with the model (Can be changed on the "My Models" page in LM Studio).

const llama3 = await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
  config: {
    contextLength: 1024,
    gpuOffload: 0.5, // Offloads 50% of the computation to the GPU
  },
});

// llama3.complete(...);
Loading a Model with a Specific Preset
The preset determines the default load configuration and the default inference configuration for a model. By default, the preset associated with the model is used. (Can be changed on the "My Models" page in LM Studio). You can change the preset used by specifying the preset option.

const llama3 = await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
  preset: "My ChatML",
});
Custom Loading Progress
You can track the loading progress of a model by providing an onProgress callback.

const llama3 = await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
  verbose: false, // Disables the default progress logging
  onProgress: progress => {
    console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
  },
});
Listing all Models that can be Loaded
If you wish to find all models that are available to be loaded, you can use the listDownloadedModel method on the system object.

const downloadedModels = await client.system.listDownloadedModels();
const downloadedLLMs = downloadedModels.filter(model => model.type === "llm");

// Load the first model
const model = await client.llm.load(downloadedLLMs[0].path);
// model.complete(...);
Canceling a Load
You can cancel a load by using an AbortController.

const controller = new AbortController();

try {
  const llama3 = await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
    signal: controller.signal,
  });
  // llama3.complete(...);
} catch (error) {
  console.error(error);
}

// Somewhere else in your code:
controller.abort();
Note

About AbortController

AbortController is a standard JavaScript API that allows you to cancel asynchronous operations. It is supported in modern browsers and Node.js. For more information, see the MDN Web Docs.

Unloading a Model
You can unload a model by calling the unload method.

const llama3 = await client.llm.load("lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF", {
  identifier: "my-model",
});

// ...Do stuff...

await client.llm.unload("my-model");
Note, by default, all models loaded by a client are unloaded when the client disconnects. Therefore, unless you want to precisely control the lifetime of a model, you do not need to unload them manually.

Note

Keeping a Model Loaded After Disconnection

If you wish to keep a model loaded after disconnection, you can set the noHup option to true when loading the model.

Using an Already Loaded Model
To look up an already loaded model by its identifier, use the following:

const myModel = await client.llm.get({ identifier: "my-model" });
// Or just
const myModel = await client.llm.get("my-model");

// myModel.complete(...);
To look up an already loaded model by its path, use the following:

// Matches any quantization
const llama3 = await client.llm.get({ path: "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF" });

// Or if a specific quantization is desired:
const llama3 = await client.llm.get({
  path: "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF/Meta-Llama-3-8B-Instruct-Q4_K_M.gguf",
});

// llama3.complete(...);
Using any Loaded Model
If you do not have a specific model in mind, and just want to use any loaded model, you can simply pass in an empty object to client.llm.get.

const anyModel = await client.llm.get({});
// anyModel.complete(...);
Listing All Loaded Models
To list all loaded models, use the client.llm.listLoaded method.

const loadedModels = await client.llm.listLoaded();

if (loadedModels.length === 0) {
  throw new Error("No models loaded");
}

// Use the first one
const firstModel = await client.llm.get({ identifier: loadedModels[0].identifier });
// firstModel.complete(...);
Example loadedModels Response:

[
  {
    "identifier": "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
    "path": "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
  },
  {
    "identifier": "microsoft/Phi-3-mini-4k-instruct-gguf/Phi-3-mini-4k-instruct-q4.gguf",
    "path": "microsoft/Phi-3-mini-4k-instruct-gguf/Phi-3-mini-4k-instruct-q4.gguf",
  },
]
Text Completion
To perform text completion, use the complete method:

const prediction = model.complete("The meaning of life is");

for await (const { content } of prediction) {
  process.stdout.write(content);
}
By default, the inference parameters in the preset is used for the prediction. You can override them like this:

const prediction = anyModel.complete("Meaning of life is", {
  contextOverflowPolicy: "stopAtLimit",
  maxPredictedTokens: 100,
  prePrompt: "Some pre-prompt",
  stopStrings: ["\n"],
  temperature: 0.7,
});

// ...Do stuff with the prediction...
Conversation
To perform a conversation, use the respond method:

const prediction = anyModel.respond([
  { role: "system", content: "Answer the following questions." },
  { role: "user", content: "What is the meaning of life?" },
]);

for await (const { content } of prediction) {
  process.stdout.write(content);
}
Similarly, you can override the inference parameters for the conversation (Note the available options are different from text completion):

const prediction = anyModel.respond(
  [
    { role: "system", content: "Answer the following questions." },
    { role: "user", content: "What is the meaning of life?" },
  ],
  {
    contextOverflowPolicy: "stopAtLimit",
    maxPredictedTokens: 100,
    stopStrings: ["\n"],
    temperature: 0.7,
    inputPrefix: "Q: ",
    inputSuffix: "\nA:",
  },
);

// ...Do stuff with the prediction...
Important

Always Provide the Full History/Context

LLMs are stateless. They do not remember or retain information from previous inputs. Therefore, when predicting with an LLM, you should always provide the full history/context.

Getting Prediction Stats
If you wish to get the prediction statistics, you can await on the prediction object to get a PredictionResult, through which you can access the stats via the stats property.

const prediction = model.complete("The meaning of life is");

for await (const { content } of prediction) {
  process.stdout.write(content);
}

const { stats } = await prediction;
console.log(stats);
Note

No Extra Waiting

When you have already consumed the prediction stream, awaiting on the prediction object will not cause any extra waiting, as the result is cached within the prediction object.

On the other hand, if you only care about the final result, you don't need to iterate through the stream. Instead, you can await on the prediction object directly to get the final result.

const prediction = model.complete("The meaning of life is");
const result = await prediction;
const content = result.content;
const stats = result.stats;

// Or just:

const { content, stats } = await model.complete("The meaning of life is");

console.log(stats);
Example output for stats:

{
  "stopReason": "eosFound",
  "tokensPerSecond": 26.644333102146646,
  "numGpuLayers": 33,
  "timeToFirstTokenSec": 0.146,
  "promptTokensCount": 5,
  "predictedTokensCount": 694,
  "totalTokensCount": 699
}
Producing JSON (Structured Output)
LM Studio supports structured prediction, which will force the model to produce content that conforms to a specific structure. To enable structured prediction, you should set the structured field. It is available for both complete and respond methods.

Here is an example of how to use structured prediction:

const prediction = model.complete("Here is a joke in JSON:", {
  maxPredictedTokens: 100,
  structured: { type: "json" },
});

const result = await prediction;
try {
  // Although the LLM is guaranteed to only produce valid JSON, when it is interrupted, the
  // partial result might not be. Always check for errors. (See caveats below)
  const parsed = JSON.parse(result.content);
  console.info(parsed);
} catch (e) {
  console.error(e);
}
Example output:

{
 "title": "The Shawshank Redemption",
 "genre": [ "drama", "thriller" ],
 "release_year": 1994,
 "cast": [
   { "name": "Tim Robbins", "role": "Andy Dufresne" },
   { "name": "Morgan Freeman", "role": "Ellis Boyd" }
 ]
}
Sometimes, any JSON is not enough. You might want to enforce a specific JSON schema. You can do this by providing a JSON schema to the structured field. Read more about JSON schema at json-schema.org.

const bookSchema = {
  type: "object",
  properties: {
    bookTitle: { type: "string" },
    author: { type: "string" },
    genre: { type: "string" },
    pageCount: { type: "number" },
  },
  required: ["bookTitle", "author", "genre"],
};

const prediction = model.complete("Books that were turned into movies:", {
  maxPredictedTokens: 100,
  structured: { type: "json", jsonSchema: bookSchema },
});

const result = await prediction;
try {
  const parsed = JSON.parse(result.content);

  console.info(parsed); // see example response below
  console.info("The bookTitle is", parsed.bookTitle); // The bookTitle is The Help
  console.info("The author is", parsed.author); // The author is Tina
  console.info("The genre is", parsed.genre); // The genre is Historical Fiction
  console.info("The pageCount is", parsed.pageCount); // The pageCount is 320
} catch (e) {
  console.error(e);
}
Example response for parsed:

{
  "author": "J.K. Rowling",
  "bookTitle": "Harry Potter and the Philosopher's Stone",
  "genre": "Fantasy",
  "pageCount": 320
}
Important

Caveats with Structured Prediction

Although the model is forced to generate predictions that conform to the specified structure, the prediction may be interrupted (for example, if the user stops the prediction). When that happens, the partial result may not conform to the specified structure. Thus, always check the prediction result before using it, for example, by wrapping the JSON.parse inside a try-catch block.
In certain cases, the model may get stuck. For example, when forcing it to generate valid JSON, it may generate a opening brace { but never generate a closing brace }. In such cases, the prediction will go on forever until the context length is reached, which can take a long time. Therefore, it is recommended to always set a maxPredictedTokens limit. This also contributes to the point above.
Canceling/Aborting a Prediction
A prediction may be canceled by calling the cancel method on the prediction object.

const prediction = model.complete("The meaning of life is");

// ...Do stuff...

prediction.cancel();
When a prediction is canceled, the prediction will stop normally but with stopReason set to "userStopped". You can detect cancellation like so:

for await (const { content } of prediction) {
  process.stdout.write(content);
}
const { stats } = await prediction;
if (stats.stopReason === "userStopped") {
  console.log("Prediction was canceled by the user");
}
About
👾 LM Studio TypeScript SDK (pre-release public alpha)

lms