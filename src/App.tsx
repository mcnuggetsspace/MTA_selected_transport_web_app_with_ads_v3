import { BusScreen } from './components/BusScreen';

export default function App() {
  const screens = [
    {
      bus: 'B82',
      times: [4, 7, 22],
    },
    {
      bus: 'M15',
      times: [2, 9, 15],
    },
    {
      bus: 'Q58',
      times: [6, 12, 28],
    },
  ];

  return (
    <div className="flex gap-8 p-8 bg-neutral-900 min-h-screen items-start justify-center">
      {screens.map((screen, index) => (
        <BusScreen
          key={index}
          busNumber={screen.bus}
          arrivalTimes={screen.times}
        />
      ))}
    </div>
  );
}
