from app.agents import SyntheticDataAgent
from langchain.chat_models import FakeListChatModel

def test_small_run():
    llm = FakeListChatModel(responses=["{\"seed\":[\"abc\"]}", "foo", "bar"])
    agent = SyntheticDataAgent(llm)
    out = agent({"prompt": "2 cols", "num_rows": 5})
    assert out["status"] == "completed"
    assert out["rows"] == 5