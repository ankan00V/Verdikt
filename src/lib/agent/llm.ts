import { ChatOpenAI } from "@langchain/openai";
import { getEnv } from "../config";

export const getLLM = () => {
  const env = getEnv();
  return new ChatOpenAI({
    modelName: "meta/llama-3.3-70b-instruct",
    temperature: 0.1,
    configuration: {
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey: env.NVIDIA_NIM_API_KEY,
    },
  });
};
