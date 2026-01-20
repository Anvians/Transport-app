import { useState } from 'react';

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{role: string, content: string}[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input) return;

    // 1. Update UI immediately
    const newHistory = [...messages, { role: "user", content: input }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      // 2. Send to YOUR Node Server
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages }),
      });

      const data = await response.json();

      // 3. Show Response
      setMessages([...newHistory, { role: "assistant", content: data.reply }]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "50px auto", fontFamily: "sans-serif" }}>
      <h1> Transport Agent</h1>
      
      <div style={{ border: "1px solid #ccc", padding: "20px", height: "400px", overflowY: "auto", marginBottom: "20px" }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ 
            textAlign: msg.role === "user" ? "right" : "left",
            margin: "10px 0" 
          }}>
            <span style={{ 
              background: msg.role === "user" ? "#007bff" : "#e9ecef",
              color: msg.role === "user" ? "white" : "black",
              padding: "8px 12px",
              borderRadius: "10px"
            }}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <i>Thinking...</i>}
      </div>

      <input 
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        placeholder="Type a command..."
        style={{ width: "80%", padding: "10px" }}
      />
      <button onClick={sendMessage} style={{ width: "18%", padding: "10px", marginLeft: "2%" }}>Send</button>
    </div>
  );
}

export default App;