import logging
import json
from typing import List, Dict, Any
from pydantic import BaseModel
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.database import get_pg_pool
from app.api.v1.endpoints.admin import get_system_stats

logger = logging.getLogger(__name__)

class AgentRouter(BaseModel):
    assigned_agent: str
    reasoning: str

class AdminAgentsManager:
    def __init__(self):
        # We use Groq via the OpenAI SDK wrapper just like the rest of the application
        if not settings.GROQ_API_KEY:
            logger.warning("GROQ_API_KEY not found in settings.")
        
        self.client = AsyncOpenAI(
            api_key=settings.GROQ_API_KEY, 
            base_url="https://api.groq.com/openai/v1"
        )
        # Using Llama 3 for fast, accurate structured routing and responses
        self.model_name = "llama-3.1-8b-instant"

    async def get_data_context(self) -> str:
        """Fetch platform metrics for the Data Agent."""
        pool = await get_pg_pool()
        try:
            async with pool.acquire() as conn:
                users = await conn.fetchval("SELECT COUNT(*) FROM users")
                interviews = await conn.fetchval("SELECT COUNT(*) FROM interviews")
                jobs = await conn.fetchval("SELECT COUNT(*) FROM jobs")
            return f"Total Users: {users}\nTotal Interviews: {interviews}\nTotal Jobs: {jobs}"
        except Exception as e:
            return f"Error fetching data: {e}"

    async def _call_groq(self, system_prompt: str, user_message: str, is_json: bool = False) -> str:
        """Helper to call Groq via OpenAI SDK."""
        try:
            kwargs = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "temperature": 0.1,
                "max_tokens": 1000
            }
            if is_json:
                kwargs["response_format"] = {"type": "json_object"}
                
            response = await self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Groq API Error: {e}")
            raise e

    async def run_devops_agent(self, user_message: str) -> str:
        """DevOps Agent: Handles CPU, Memory, Disk."""
        sys_stats = get_system_stats()
        context = f"""
        You are the DevOps Sub-Agent. 
        Current System Health:
        - CPU: {sys_stats.get('cpu_usage_percent')}% ({sys_stats.get('cpu_cores')} Cores)
        - Memory: {sys_stats.get('memory_used_gb')}GB / {sys_stats.get('memory_total_gb')}GB ({sys_stats.get('memory_percent')}%)
        - Disk: {sys_stats.get('disk_percent')}%
        - OS: {sys_stats.get('os')}
        """
        response_text = await self._call_groq(context, user_message)
        return f"**[DevOps Agent]**\n\n{response_text}"

    async def run_data_agent(self, user_message: str) -> str:
        """Data Agent: Handles queries about users, jobs, platforms."""
        data_context = await self.get_data_context()
        context = f"""
        You are the Data Sub-Agent.
        Current Platform Metrics:
        {data_context}
        """
        response_text = await self._call_groq(context, user_message)
        return f"**[Data Agent]**\n\n{response_text}"

    async def run_security_agent(self, user_message: str) -> str:
        """Security Agent: Handles auth, proctoring, policies."""
        context = """
        You are the Security Sub-Agent. You handle queries about proctoring rules, tab-switch violations, and AWS Cognito settings.
        Currently, the system is enforcing a strict no-tab-switch policy.
        """
        response_text = await self._call_groq(context, user_message)
        return f"**[Security Agent]**\n\n{response_text}"

    async def process_message(self, user_message: str) -> str:
        if not settings.GROQ_API_KEY:
            return "🚨 The Multi-Agent Manager is offline. Please add `GROQ_API_KEY` to your backend `.env` file."

        manager_prompt = """
        You are the Multi-Agent Manager for the Admin Dashboard.
        You must analyze the user's message and decide which sub-agent should handle it.
        Available Agents:
        - "devops": For CPU, memory, disk, server health, OS.
        - "data": For user counts, job postings, total interviews, database records.
        - "security": For proctoring, cheating, authentication, policies.
        
        You must strictly return a valid JSON object with exactly two keys: "assigned_agent" and "reasoning".
        Example: {"assigned_agent": "devops", "reasoning": "The user asked about CPU usage."}
        """

        try:
            # 1. Manager decides via JSON output
            manager_response_text = await self._call_groq(manager_prompt, user_message, is_json=True)
            
            try:
                decision = json.loads(manager_response_text)
                agent_name = decision.get("assigned_agent", "data").lower()
            except json.JSONDecodeError:
                agent_name = "data" # Fallback
            
            # 2. Route to the specific agent
            if "devops" in agent_name:
                return await self.run_devops_agent(user_message)
            elif "data" in agent_name:
                return await self.run_data_agent(user_message)
            elif "security" in agent_name:
                return await self.run_security_agent(user_message)
            else:
                # Fallback to data agent if confused
                return await self.run_data_agent(user_message)
                
        except Exception as e:
            logger.error(f"Manager Agent Error: {e}")
            return f"🚨 Manager encountered an error: {e}"

admin_agents = AdminAgentsManager()
