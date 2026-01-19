export default function HelpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-light md:text-5xl">Help</h1>
        <p className="mb-2 text-gray-400">
          Learn how our Lightning AI works.
        </p>
        <p className="text-gray-500 text-sm">
          Our AI creates lightning animations using advanced neural networks. Adjust the hue slider
          to see how the AI adapts in real-time. Every bolt is generated intelligently, not pre-rendered.
        </p>
      </div>
    </main>
  );
}


