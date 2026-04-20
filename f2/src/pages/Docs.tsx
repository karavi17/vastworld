import { FileText, Globe, Server, ShieldCheck, Download, Zap } from 'lucide-react';

export default function DocsPage() {
  const sections = [
    {
      title: "Project Overview",
      icon: <Globe className="text-blue-500" size={24} />,
      content: "VastWorld is a high-performance streaming application designed to provide a seamless movie and TV series watching experience. It utilizes a custom proxy backend to ensure stable playback across all environments."
    },
    {
      title: "Deployment Status",
      icon: <Zap className="text-yellow-500" size={24} />,
      content: "The backend is currently deployed on Railway, providing a robust and scalable infrastructure. The frontend is optimized for production using Vite and TypeScript."
    },
    {
      title: "Localhost Spoofing",
      icon: <ShieldCheck className="text-green-500" size={24} />,
      content: "To bypass strict API restrictions, the backend implements localhost spoofing. This tricks upstream servers into treating production requests as local development traffic, ensuring uninterrupted service."
    },
    {
      title: "Offline Downloads",
      icon: <Download className="text-purple-500" size={24} />,
      content: "Users can save videos for offline viewing directly within the app or download them to their local device with intelligent filenaming (Title + Season + Episode)."
    },
    {
      title: "Backend Endpoints",
      icon: <Server className="text-red-500" size={24} />,
      content: "Primary API endpoints include: /api/trending, /api/homepage, /api/search, /api/info, and the high-performance /api/stream proxy."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 text-white">
      <div className="flex items-center gap-4 mb-8 border-b border-[#303030] pb-6">
        <div className="p-3 bg-red-600 rounded-xl">
          <FileText size={32} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Documentation</h1>
          <p className="text-[#aaaaaa]">Technical overview and project details</p>
        </div>
      </div>

      <div className="grid gap-6">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-[#1a1a1a] border border-[#303030] p-6 rounded-2xl hover:border-red-600/50 transition-colors group">
            <div className="flex items-center gap-3 mb-3">
              {section.icon}
              <h2 className="text-xl font-bold group-hover:text-red-500 transition-colors">{section.title}</h2>
            </div>
            <p className="text-[#aaaaaa] leading-relaxed">
              {section.content}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 p-8 bg-gradient-to-br from-red-600/20 to-purple-600/20 rounded-3xl border border-red-600/30 text-center">
        <h3 className="text-2xl font-bold mb-4">Want to contribute?</h3>
        <p className="text-[#aaaaaa] mb-6 max-w-lg mx-auto">
          Visit the official GitHub repository to view the source code, report issues, or suggest new features.
        </p>
        <a 
          href="https://github.com/karavi17/vastworld" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors"
        >
          View on GitHub
        </a>
      </div>

      <footer className="mt-16 text-center text-[#555555] text-sm">
        <p>© 2024 VastWorld Official • Technical Documentation v1.2</p>
      </footer>
    </div>
  );
}
