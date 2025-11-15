from typing import TypedDict, Required, NotRequired
from enum import Enum
from langchain_core.language_models.chat_models import BaseChatModel


class LLMFactory:
    class Config(TypedDict):
        model_name: Required[str]
        api_key: Required[str]
        api_endpoint: NotRequired[str]
        max_tokens: NotRequired[int]
        temperature: NotRequired[float]
        timeout: NotRequired[float]
        max_retries: NotRequired[int]

    class Provider(Enum):
        OPENAI = "openai"
        BEDROCK = "bedrock"
        GROQ = "groq"

    @staticmethod
    def create_llm(llm_provider: Provider, config: Config) -> BaseChatModel:
        if llm_provider == LLMFactory.Provider.OPENAI:
            from langchain_openai import ChatOpenAI

            kwargs = {"model": config["model_name"], "api_key": config["api_key"]}

            if "api_endpoint" in config:
                kwargs["api_endpoint"] = config["api_endpoint"]
            if "max_tokens" in config:
                kwargs["max_tokens"] = config["max_tokens"]
            if "temperature" in config:
                kwargs["temperature"] = config["temperature"]
            if "max_retries" in config:
                kwargs["max_retries"] = config["max_retries"]
            if "timeout" in config:
                kwargs["timeout"] = config["timeout"]
            return ChatOpenAI(**kwargs)

        if llm_provider == LLMFactory.Provider.BEDROCK:
            from langchain_aws import ChatBedrockConverse

            kwargs = {"model": config["model_name"], "api_key": config["api_key"]}

            if "api_endpoint" in config:
                kwargs["api_endpoint"] = config["api_endpoint"]
            if "max_tokens" in config:
                kwargs["max_tokens"] = config["max_tokens"]
            if "temperature" in config:
                kwargs["temperature"] = config["temperature"]
            if "max_retries" in config:
                kwargs["max_retries"] = config["max_retries"]
            if "timeout" in config:
                kwargs["timeout"] = config["timeout"]

            return ChatBedrockConverse(**kwargs)

        if llm_provider == LLMFactory.Provider.GROQ:
            from langchain_groq import ChatGroq

            kwargs = {"model": config["model_name"], "api_key": config["api_key"]}

            if "api_endpoint" in config:
                kwargs["api_endpoint"] = config["api_endpoint"]
            if "max_tokens" in config:
                kwargs["max_tokens"] = config["max_tokens"]
            if "temperature" in config:
                kwargs["temperature"] = config["temperature"]
            if "max_retries" in config:
                kwargs["max_retries"] = config["max_retries"]
            if "timeout" in config:
                kwargs["timeout"] = config["timeout"]

            return ChatGroq(**kwargs)

        raise ValueError(f"Not supported LLM Provider: {llm_provider}")

        if llm_provider not in LLMFactory.Provider:
            raise ValueError(f"Not in LLM Provider: {llm_provider}")
