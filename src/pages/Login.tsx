import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/auth";

const backgroundImages = [
  "/login-bg.png",
  "/login-bg-2.jpg",
  "/login-bg-3.jpg",
  "/login-bg-4.jpg"
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentBg, setCurrentBg] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      } else if (data?.session) {
        const supabaseUser = data.session.user;
        login(data.session.access_token, {
          id: supabaseUser.id,
          email: supabaseUser.email ?? "",
          role: supabaseUser.user_metadata?.role ?? "user",
        });
        navigate("/dashboard");
      }
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred.", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side — Branding with hero image slideshow */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Images with Fade Transition */}
        {backgroundImages.map((img, idx) => (
          <div
            key={img}
            className={`absolute inset-0 z-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${idx === currentBg ? 'opacity-100' : 'opacity-0'}`}
            style={{ backgroundImage: `url("${img}")` }}
          />
        ))}

        {/* Gradient Overlay for Legibility */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-black/80 via-black/40 to-transparent" />

        <div className="relative z-10 px-16 text-center w-full mt-auto mb-20">
          {/* MohanTrader Logo */}
          <img
            src="/mohantrader-logo.png"
            alt="MohanTrader"
            className="h-24 w-24 mx-auto mb-8 object-contain rounded-2xl bg-white/10 backdrop-blur-sm p-2 border border-white/20"
          />
          <h1 className="text-4xl font-bold text-white tracking-tight leading-tight drop-shadow-lg">
            Mohan Trading
          </h1>
          <p className="text-white/80 mt-2 text-lg italic font-display tracking-wide drop-shadow-md">
            Delivering Dreams, Driving Trust
          </p>
          <p className="text-white/60 mt-6 text-sm max-w-sm mx-auto leading-relaxed drop-shadow-sm">
            The premium platform for managing your vehicle inventory and accelerating your sales pipeline.
          </p>

          {/* Slideshow dots */}
          <div className="flex items-center justify-center gap-2 mt-10">
            {backgroundImages.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 transition-all duration-300 rounded-full ${idx === currentBg ? 'w-12 bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]' : 'w-2 bg-white/20'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right side — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white relative overflow-hidden">



        {/* Large centered watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src="/mohantrader-logo.png"
            alt=""
            aria-hidden="true"
            className="w-[90%] max-w-[600px] object-contain opacity-[0.04] select-none"
          />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img
              src="/mohantrader-logo.png"
              alt="MohanTrader"
              className="h-12 w-12 rounded-xl object-contain"
            />
            <div>
              <p className="text-lg font-semibold">Mohan Trading</p>
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
                placeholder=""
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
        </div>
      </div>
    </div>
  );
}
