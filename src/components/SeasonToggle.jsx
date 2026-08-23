import { useSeason } from '../hooks/SeasonContext';

export default function SeasonToggle({ className = '' }) {
  const { season, setSeason, availableSeasons } = useSeason();

  return (
    <div className={`inline-flex items-center gap-1 rounded-full bg-gray-800/80 border border-gray-700/60 p-0.5 ${className}`}>
      {availableSeasons.map((s) => (
        <button
          key={s}
          onClick={() => setSeason(s)}
          className={`
            px-3 py-1 rounded-full text-xs font-bold transition-all duration-200
            min-h-[32px] min-w-[56px]
            ${season === s
              ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 shadow-md shadow-yellow-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50 active:scale-95'
            }
          `}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
