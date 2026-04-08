import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
const slides = [
  "/hero-raptor.png",
  "/hero-car-1.png",
  "/hero-car-3.jpg",
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        login(data.token, data.user);
        navigate("/dashboard");
      } else {
        toast({ title: "Login Failed", description: data.error, variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Could not connect to server.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side — raptor branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-slate-950">
        
        {/* Slideshow */}
        {slides.map((slide, index) => (
          <img
            key={slide}
            src={slide}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              currentSlide === index ? "opacity-60" : "opacity-0"
            }`}
            style={{ zIndex: 1 }}
            alt="Showroom Vehicle"
          />
        ))}

        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-slate-950/40 z-[5]" />

        <div className="relative z-10 px-16 text-center">
          {/* MohanTrader Logo */}
          <img 
            src="/mohantrader-logo.png" 
            alt="MohanTrader" 
            className="h-24 w-24 mx-auto mb-8 object-contain rounded-2xl bg-white/10 backdrop-blur-md p-2 shadow-2xl ring-1 ring-white/20"
          />
          <h1 className="text-4xl font-semibold text-white tracking-tight leading-tight drop-shadow-lg">
            Mohan Trader
          </h1>
          <p className="text-white/80 mt-2 text-base italic font-display tracking-wide drop-shadow-md">
            Delivering Dreams, Driving Trust
          </p>
          <p className="text-white/60 mt-4 text-sm max-w-sm mx-auto leading-relaxed drop-shadow-sm border-t border-white/10 pt-4">
            Your complete CRM for managing vehicle inventory, leads, and sales pipeline — all in one place.
          </p>
          
          {/* Decorative bar */}
          <div className="flex items-center justify-center gap-2 mt-8 relative z-20">
            {slides.map((_, idx) => (
              <button 
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 hover:bg-white cursor-pointer ${currentSlide === idx ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'}`} 
              />
            ))}
          </div>
        </div>
        {/* Subtle grid pattern over everything for texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-10" style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img 
              src="/mohantrader-logo.png" 
              alt="MohanTrader" 
              className="h-12 w-12 rounded-xl object-contain"
            />
            <div>
              <p className="text-lg font-semibold">Mohan Trader</p>
              <p className="text-[10px] text-muted-foreground italic">Delivering Dreams, Driving Trust</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground mt-1.5">
              Enter your credentials to access the dashboard.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                placeholder="sales@mohantrader.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-background border-border text-sm focus:border-primary focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-background border-border text-sm focus:border-primary focus:ring-primary/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full h-11 bg-primary text-white hover:bg-primary/90 text-sm font-medium rounded-lg shadow-sm shadow-primary/20" 
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8 italic">
            Mohan Trader · Delivering Dreams, Driving Trust
          </p>
        </div>
      </div>
    </div>
  );
}
