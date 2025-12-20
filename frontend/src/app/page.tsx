import MapComponent from './components/MapComponent';
import RecordButton from './components/RecordButton';

export default function Home() {
  return (
    <main className="relative min-h-screen flex-col items-center justify-between">
      <MapComponent />
      <RecordButton />
      
      {/* Overlay UI Elements */}
      <div className="fixed top-4 right-4 z-10 flex gap-2">
        <button className="bg-white/90 dark:bg-black/90 backdrop-blur px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors">
          My Stories
        </button>
        <button className="bg-black text-white px-4 py-2 rounded-full text-sm font-medium shadow-sm hover:bg-gray-800 transition-colors">
          Explore
        </button>
      </div>
    </main>
  );
}
