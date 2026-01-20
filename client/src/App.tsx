import { useState, useEffect } from "react";

// Define the shape of a Shipment
interface Shipment {
  id: string;
  origin: string;
  destination: string;
  weight: string;
  item: string;
  status: string;
}

function App() {
  // Chat State
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Dashboard State
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const fetchShipments = async () => {
    try {
      const res = await fetch("http://localhost:3001/shipments");
      const data = await res.json();
      setShipments(data);
    } catch {
      console.error("Failed to fetch dashboard data");
    }
  };

  useEffect(() => {
    fetchShipments();
  }, []);

  const sendMessage = async () => {
    if (!input) return;

    const newHistory = [...messages, { role: "user", content: input }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, history: messages }),
      });

      const data = await response.json();
      setMessages([...newHistory, { role: "assistant", content: data.reply }]);
      fetchShipments();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen font-sans">
      {/* LEFT PANEL: Dashboard */}
      <div className="w-1/2 p-6 bg-gray-100 border-r border-gray-300">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
           Live Shipments
        </h2>

        {shipments.length === 0 ? (
          <p className="text-gray-600">
            No active shipments. Ask the agent to book one!
          </p>
        ) : (
          <table className="w-full border-collapse bg-white shadow-md rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-blue-600 text-white text-left">
                <th className="p-3">ID</th>
                <th className="p-3">Route</th>
                <th className="p-3">Item</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s) => (
                <tr key={s.id} className="border-b border-gray-200">
                  <td className="p-3 font-bold">{s.id}</td>
                  <td className="p-3">
                    {s.origin} ➝ {s.destination}
                  </td>
                  <td className="p-3">
                    {s.weight} of {s.item}
                  </td>
                  <td className="p-3 text-green-600 font-medium">
                    ● {s.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* RIGHT PANEL: Chat */}
      <div className="w-1/2 p-6 flex flex-col">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
           Dispatch Agent
        </h2>

        <div className="flex-1 border border-gray-300 rounded-lg p-5 overflow-y-auto mb-5">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`my-2 ${
                msg.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <span
                className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {msg.content}
              </span>
            </div>
          ))}

          {loading && (
            <i className="text-gray-500">Agent is processing...</i>
          )}
        </div>

        <div className="flex">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ex: Send 500kg of steel from Delhi to Mumbai"
            className="flex-1 p-4 border border-gray-300 rounded-md mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            className="px-8 py-4 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 transition"
          >
            SEND
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
