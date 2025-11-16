import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface BusScreenProps {
  busNumber: string;
  arrivalTimes: number[];
}

export function BusScreen({ busNumber, arrivalTimes }: BusScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const pizzaSlides = [
    { 
      title: 'MARGHERITA', 
      price: '$12.99',
      image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXJnaGVyaXRhJTIwcGl6emF8ZW58MXx8fHwxNzYzMjQ0Mzk3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    { 
      title: 'PEPPERONI', 
      price: '$14.99',
      image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwZXBwZXJvbmklMjBwaXp6YXxlbnwxfHx8fDE3NjMxOTAxODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    { 
      title: 'QUATTRO FORMAGGI', 
      price: '$16.99',
      image: 'https://images.unsplash.com/photo-1732223229355-95a1433404bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVlc2UlMjBwaXp6YXxlbnwxfHx8fDE3NjMxNjkxMDV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    { 
      title: 'PROSCIUTTO', 
      price: '$17.99',
      image: 'https://images.unsplash.com/photo-1700760934249-93efbb574d23?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWF0JTIwcGl6emF8ZW58MXx8fHwxNzYzMjc0Mzg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
    { 
      title: 'DIAVOLA', 
      price: '$15.99',
      image: 'https://images.unsplash.com/photo-1676723009754-8359b42536ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZWxpY2lvdXMlMjBwaXp6YXxlbnwxfHx8fDE3NjMyNzQzODh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral'
    },
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % pizzaSlides.length);
    }, 3000);

    return () => clearInterval(slideInterval);
  }, [pizzaSlides.length]);

  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="w-[540px] h-[960px] bg-gradient-to-br from-neutral-950 via-black to-neutral-900 flex flex-col overflow-hidden shadow-2xl">
      {/* Top 15% - Bus Info in one line */}
      <div className="h-[15%] bg-gradient-to-b from-neutral-900 to-black flex items-center justify-between px-8 border-b border-cyan-500/20 relative overflow-hidden">
        {/* Subtle gradient overlay with cyan accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/10 pointer-events-none" />
        
        <div className="flex items-center gap-8 w-full relative z-10">
          {/* Bus Number - Left */}
          <div className="bg-white text-black px-6 py-3 rounded-xl shadow-xl shadow-white/20">
            <span className="tracking-wider" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 900, fontSize: '56px' }}>
              {busNumber}
            </span>
          </div>
          
          {/* Arrival Times - Right inline */}
          <div className="flex items-baseline gap-3 flex-1 justify-end">
            {arrivalTimes.map((time, index) => (
              <div key={index} className="flex items-baseline">
                <span 
                  className="text-white tabular-nums drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]" 
                  style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 900, fontSize: '52px' }}
                >
                  {time}
                </span>
                {index < arrivalTimes.length - 1 ? (
                  <span 
                    className="text-white/50 mx-3" 
                    style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 400, fontSize: '48px' }}
                  >
                    /
                  </span>
                ) : (
                  <span 
                    className="text-white ml-2 drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]" 
                    style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500, fontSize: '32px' }}
                  >
                    min
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Middle 75% - Pizza Advertisement */}
      <div className="h-[75%] bg-gradient-to-b from-black to-neutral-950 flex items-center justify-center relative overflow-hidden">
        {/* Modern gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 pointer-events-none" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-full relative">
            {/* Pizza Image */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl blur-3xl" />
                <ImageWithFallback
                  src={pizzaSlides[currentSlide].image}
                  alt={pizzaSlides[currentSlide].title}
                  className="w-full h-full object-cover rounded-2xl shadow-2xl relative z-10 border border-white/10"
                />
              </div>
            </div>
            
            {/* Text Overlay */}
            <div className="absolute bottom-8 left-0 right-0 text-center z-20">
              <div className="bg-black/80 backdrop-blur-md py-8 border-y border-white/20">
                <div className="text-white mb-3 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500, fontSize: '48px', letterSpacing: '0.1em' }}>
                  {pizzaSlides[currentSlide].title}
                </div>
                <div className="text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 900, fontSize: '64px' }}>
                  {pizzaSlides[currentSlide].price}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Slide indicators */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-30">
          {pizzaSlides.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white scale-125' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom 10% - Footer */}
      <div className="h-[10%] bg-gradient-to-t from-neutral-900 to-black border-t border-white/20 flex items-center justify-between px-6 gap-4 relative overflow-hidden">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/5 via-transparent to-white/5 pointer-events-none" />
        
        {/* QR Code - Left */}
        <div className="flex items-center h-full py-3 z-10 flex-shrink-0">
          <div className="bg-white p-1.5 rounded-lg shadow-lg">
            <QRCodeSVG
              value="https://pizzeria.example.com"
              size={52}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>
        </div>

        {/* Center Text */}
        <div className="flex-1 text-center relative z-10 min-w-0">
          <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 500, fontSize: '36px', letterSpacing: '0.05em' }}>
            Order Online
          </span>
        </div>

        {/* Time - Right */}
        <div className="flex items-center h-full z-10 flex-shrink-0">
          <div className="bg-white/10 px-4 py-2 rounded-lg border border-white/20 backdrop-blur-sm">
            <span className="text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" style={{ fontFamily: 'Helvetica, Arial, sans-serif', fontWeight: 700, fontSize: '28px', letterSpacing: '0.05em' }}>
              {formatTime(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}