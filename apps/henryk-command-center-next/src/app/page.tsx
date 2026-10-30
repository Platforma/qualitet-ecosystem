export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-5xl font-bold mb-8">
        Henryk Command Center
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-cyan-400 text-xl">
            Project Score
          </h2>
          <p className="text-5xl mt-4">
            100/100
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-cyan-400 text-xl">
            System Health
          </h2>

          <p>Cloudflare OK</p>
          <p>MongoDB OK</p>
          <p>Ollama OK</p>
          <p>Render OK</p>
          <p>GitHub OK</p>
          <p>DNS OK</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl">
          <h2 className="text-cyan-400 text-xl">
            AI Center
          </h2>

          <p>AI_QUALITET</p>
          <p>AI_DEVELOPER</p>
          <p>AI_GRAFIK_SZEF</p>
          <p>AI_MARKETING</p>
          <p>AI_SEO</p>
        </div>

      </div>
    </main>
  );
}
