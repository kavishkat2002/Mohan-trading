import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
    Brain,
    ChevronRight,
    DollarSign,
    TrendingUp,
    Users,
    Zap,
    MessageSquare,
    PhoneCall,
    ShieldCheck,
    Award,
    Eye,
    LayoutDashboard,
    Package,
    Calendar,
    ArrowRight,
    Settings2,
    Upload,
    RotateCcw,
    Mail
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const VisualProposal = () => {
    const { scrollYProgress } = useScroll();
    const opacity = useTransform(scrollYProgress, [0, 0.05], [1, 0]);

    const [customImages, setCustomImages] = useState({
        dashboard: "/dashboard_ui_presentation_1771051945709.png",
        voice: "/ai_voice_agent_mockup_1771051579251.png",
        whatsapp: "/whatsapp_ai_process_visual_v2_1771051968210.png",
        vision: "/ai_vision_mockup.png"
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof customImages) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCustomImages(prev => ({ ...prev, [key]: url }));
        }
    };

    const resetToDefaults = () => {
        setCustomImages({
            dashboard: "/dashboard_ui_presentation_1771051945709.png",
            voice: "/ai_voice_agent_mockup_1771051579251.png",
            whatsapp: "/whatsapp_ai_process_visual_v2_1771051968210.png",
            vision: "/ai_vision_mockup.png"
        });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans overflow-x-hidden">
            {/* Progress Bar */}
            <motion.div
                className="fixed top-0 left-0 right-0 h-1 bg-primary z-50 origin-left"
                style={{ scaleX: scrollYProgress }}
            />

            {/* Professional Proposal Designer Tool - Hidden for Client View */}
            <div className="fixed bottom-8 right-8 z-[60] print:hidden hidden">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="h-14 w-14 rounded-full shadow-2xl bg-white text-black hover:bg-primary hover:text-white transition-all border border-white/10">
                            <Settings2 className="w-6 h-6" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-black/95 border-white/10 text-white max-w-md backdrop-blur-2xl">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-display font-bold">Proposal Designer</DialogTitle>
                            <DialogDescription className="text-white/40">
                                Upload real screenshots of your system to personalize this presentation for your client.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 pt-6">
                            {[
                                { id: 'dashboard', label: 'Command Center Screenshot' },
                                { id: 'voice', label: 'Sinhala Voice Interface' },
                                { id: 'whatsapp', label: 'WhatsApp Automation Flow' },
                                { id: 'vision', label: 'AI Vision Mockup' }
                            ].map((item) => (
                                <div key={item.id} className="grid gap-2">
                                    <Label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">{item.label}</Label>
                                    <div className="relative group">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, item.id as any)}
                                            className="bg-white/5 border-white/10 h-11 file:text-primary file:font-bold hover:bg-white/10 transition-colors"
                                        />
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-white/10 hover:bg-white/5 gap-2 h-12"
                                    onClick={resetToDefaults}
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    Default View
                                </Button>
                                <Button
                                    className="flex-1 bg-primary text-white h-12"
                                    onClick={() => window.print()}
                                >
                                    Print to PDF
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>


            {/* Hero Slide */}
            <section className="h-screen flex flex-col items-center justify-center relative px-4 text-center">
                <motion.div
                    style={{ opacity }}
                    className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-transparent pointer-events-none"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="z-10"
                >
                    <Badge className="mb-6 py-1.5 px-6 text-sm font-bold tracking-widest uppercase bg-primary text-white border-none rounded-full shadow-lg shadow-primary/20">
                        Creativex Lab • Autonomous Retail Intelligence
                    </Badge>
                    <h1 className="text-6xl md:text-8xl font-display font-extrabold tracking-tighter mb-8 leading-none">
                        SmartBiz <br />
                        <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-600 bg-clip-text text-transparent">
                            AI CONNECT
                        </span>
                    </h1>
                    <p className="text-xl md:text-2xl text-white/60 max-w-3xl mx-auto font-light leading-relaxed">
                        The 24/7 Digital Employee for Next-Gen Retail. <br />
                        Automate sales, identify VIPs, and predict revenue—all in one system.
                    </p>

                    <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Button
                            onClick={() => window.open('https://drive.google.com/drive/folders/1-u_k8zSVj4sDC7Na8-57Oz0NjsqyrauJ?usp=sharing', '_blank')}
                            className="h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xl group"
                        >
                            <LayoutDashboard className="mr-2 w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
                            View Demo
                        </Button>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-1 bg-primary/50 rounded-full" />
                            <p className="text-xs uppercase tracking-[0.3em] font-bold text-white/40">Scroll to Experience</p>
                            <div className="w-12 h-1 bg-primary/50 rounded-full" />
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* The High-Impact Triple Threat */}
            <section className="py-24 px-4 bg-gradient-to-b from-transparent to-white/[0.02]">
                <div className="container mx-auto text-center mb-16">
                    <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 italic text-primary">The Triple-Threat Strategy</h2>
                    <p className="text-white/40 max-w-2xl mx-auto">Dominating every channel where your customers live.</p>
                </div>

                <div className="container mx-auto grid lg:grid-cols-3 gap-8">
                    <div className="space-y-6 p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-primary transition-all group">
                        <PhoneCall className="w-12 h-12 text-primary" />
                        <h3 className="text-2xl font-bold">Sinhala AI Voice</h3>
                        <p className="text-white/40 text-sm">Allows customers to place orders over the phone by talking naturally in Sinhala or Singlish.</p>
                        <img src={customImages.voice} className="rounded-2xl border border-white/5 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="space-y-6 p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-green-500 transition-all group">
                        <MessageSquare className="w-12 h-12 text-green-500" />
                        <h3 className="text-2xl font-bold">WhatsApp Sales</h3>
                        <p className="text-white/40 text-sm">Turns WhatsApp into a 24/7 store where customers can browse, order, and pay instantly.</p>
                        <img src={customImages.whatsapp} className="rounded-2xl border border-white/5 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="space-y-6 p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-purple-500 transition-all group">
                        <Eye className="w-12 h-12 text-purple-500" />
                        <h3 className="text-2xl font-bold">AI Visual Search</h3>
                        <p className="text-white/40 text-sm">Customers just send a photo of what they want, and the AI finds the exact match in your store.</p>
                        <img src={customImages.vision} className="rounded-2xl border border-white/5 group-hover:scale-105 transition-transform duration-500" />
                    </div>
                </div>
            </section>

            {/* NEW: Autonomous Brain & Command Center */}
            <section className="min-h-screen py-24 bg-[#0a0a0a] px-4 relative">
                <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full opacity-10" />
                <div className="container mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
                        <div className="space-y-8">
                            <Badge className="bg-primary/20 text-primary border-none">Autonomous Intelligence</Badge>
                            <h2 className="text-4xl md:text-7xl font-display font-bold leading-tight">Beyond a Chatbot. <br /> A <span className="text-primary">Thinking</span> System.</h2>
                            <div className="grid gap-6">
                                <LogicFeature icon={Zap} title="Independent Task Handling" desc="The AI manages stock checks, calculations, and system updates without any manual help." />
                                <LogicFeature icon={Users} title="Smart Human Handoff" desc="When a serious buyer is identified, the AI alerts your team so you can step in to close the sale." />
                                <LogicFeature icon={RotateCcw} title="Real-Time Channel Sync" desc="Every order from Voice or WhatsApp is updated across your business instantly." />
                            </div>
                        </div>
                        <div className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/10 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-6">
                                <Brain className="w-8 h-8 text-primary" />
                                <h4 className="font-bold text-xl">Simplified Logic Flow</h4>
                            </div>
                            <div className="space-y-6">
                                <div className="flex gap-4 items-center">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">1</div>
                                    <p className="text-sm font-medium">Understands what the customer wants from their voice or photos.</p>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">2</div>
                                    <p className="text-sm font-medium">Instantly checks your actual inventory to confirm availability.</p>
                                </div>
                                <div className="flex gap-4 items-center">
                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">3</div>
                                    <p className="text-sm font-medium">Automatically creates the order and sends a payment link.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="order-2 lg:order-1 relative">
                            <img src={customImages.dashboard} className="rounded-3xl border border-white/10 shadow-2xl relative z-10" />
                        </div>
                        <div className="order-1 lg:order-2 space-y-8">
                            <Badge className="bg-blue-500/20 text-blue-500 border-none">Command Center</Badge>
                            <h2 className="text-4xl md:text-6xl font-display font-bold">Predictive <br /> <span className="text-blue-500">Business Health</span></h2>
                            <div className="grid grid-cols-2 gap-4">
                                <DashboardFeatureCard title="Revenue Forecasts" desc="AI-driven inventory optimization." />
                                <DashboardFeatureCard title="VIP Segmenter" desc="Auto-identify high-value customers." />
                                <DashboardFeatureCard title="Stock Intelligent" desc="Predictive low-stock notifications." />
                                <DashboardFeatureCard title="AI Activity Log" desc="Real-time transparency on agent work." />
                            </div>
                        </div>
                    </div>

                    {/* NEW: The Intelligent Ecosystem */}
                    <div className="mt-32 pt-24 border-t border-white/5">
                        <div className="text-center mb-16">
                            <Badge className="bg-purple-500/20 text-purple-500 border-none mb-4 uppercase tracking-[0.2em]">The Ecosystem</Badge>
                            <h2 className="text-4xl md:text-6xl font-display font-bold italic">Scale Without Overhead</h2>
                        </div>
                        <div className="grid md:grid-cols-4 gap-6">
                            <EcosystemCard 
                                icon={Package} 
                                title="ERP & Stock Sync" 
                                desc="Real-time central inventory updates across all sales channels." 
                            />
                            <EcosystemCard 
                                icon={TrendingUp} 
                                title="Abandoned Cart" 
                                desc="Automated WhatsApp follow-ups that recover 25% of lost sales." 
                            />
                            <EcosystemCard 
                                icon={Users} 
                                title="Multi-Branch" 
                                desc="One AI brain managing inventory & orders across all locations." 
                            />
                            <EcosystemCard 
                                icon={ShieldCheck} 
                                title="Fraud-Proof Slips" 
                                desc="Computer Vision detects pixel manipulation & duplicate IDs to reject fake bank slips automatically." 
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Commercial Packages */}
            <section className="py-32 px-4 bg-white/[0.02]">
                <div className="container mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 text-primary">Commercial Packages</h2>
                        <p className="text-white/40">Tiered solutions for every scale of business</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <PricingCard
                            tag="Growth"
                            ideal="Small Retailers"
                            price="Rs. 8,500"
                            features={["WhatsApp/Telegram Bot", "Order Automation", "24/7 Technical Support"]}
                        />
                        <PricingCard
                            tag="Professional"
                            ideal="Medium Businesses"
                            price="Rs. 25,000"
                            featured={true}
                            features={["Everything in Growth", "Sinhala Voice Agent", "24/7 Technical Support"]}
                        />
                        <PricingCard
                            tag="Enterprise"
                            ideal="Corporate Brands"
                            price="Contact Us"
                            features={["Custom Knowledge Graph", "Dedicated Support", "24/7 Priority Support"]}
                        />
                    </div>
                </div>
            </section>

            {/* Implementation Roadmap */}
            <section className="py-32 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-6xl font-display font-bold mb-4 text-primary">Deployment Roadmap</h2>
                        <p className="text-white/40">From integration to optimization in 4 days</p>
                    </div>
                    <div className="space-y-12">
                        <RoadmapItem step="01" title="Intelligence Mapping" days="2 Days" desc="Deep ingestion of product catalogs and business logic into the central AI brain." />
                        <RoadmapItem step="02" title="Neural Integration" days="1 Day" desc="Cross-channel API wiring for WhatsApp, Voice, and Centralized Inventory." />
                        <RoadmapItem step="03" title="Market Launch" days="Go Live" desc="Deployment of the live autonomous ecosystem across all business touchpoints." />
                    </div>
                </div>
            </section>

            {/* ROI Slide */}
            <section className="min-h-screen flex flex-col items-center justify-center py-20 px-4 text-center bg-primary">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-4xl"
                >
                    <Award className="w-20 h-20 text-white/20 absolute -top-10 left-1/2 -translate-x-1/2" />
                    <h2 className="text-5xl md:text-8xl font-display font-extrabold mb-8 italic tracking-tighter">
                        UNMATCHED ROI
                    </h2>
                    <p className="text-2xl text-white/90 font-medium mb-16 leading-relaxed">
                        SmartBiz AI Connect doesn't just save time—it creates a competitive moat for your business.
                    </p>

                    <div className="grid md:grid-cols-3 gap-12 text-black">
                        <ROICard title="Revenue Growth" val="+35%" desc="On average via 24/7 responsiveness" />
                        <ROICard title="Cost Reduction" val="-55%" desc="On manual customer service overheads" />
                        <ROICard title="Customer Satisfaction" val="98%" desc="High retention through instant AI help" />
                    </div>
                </motion.div>
            </section>

            {/* Final Call to Action */}
            <section className="py-32 px-4 text-center">
                <h2 className="text-4xl md:text-6xl font-display font-bold mb-8">Ready to Scale?</h2>
                <p className="text-xl text-white/40 mb-12 max-w-2xl mx-auto">
                    Join the elite circle of businesses leveraging the power of multimodal AI.
                    Let's automate your future, today.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <Button
                        size="lg"
                        className="h-16 px-10 text-lg bg-primary hover:bg-primary/90 text-white shadow-2xl shadow-primary/30 rounded-2xl group"
                        onClick={() => window.open('https://wa.me/94703375336?text=I%27m%20interested%20in%20the%20SmartBiz%20AI%20Connect%20Private%20Beta', '_blank')}
                    >
                        Request Private Beta
                        <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                        variant="outline"
                        size="lg"
                        className="h-16 px-10 text-lg border-white/10 bg-white/5 hover:bg-white/10 rounded-2xl gap-2"
                        onClick={() => window.location.href = 'mailto:tkavishka101@gmail.com?subject=SmartBiz%20AI%20Connect%20Inquiry'}
                    >
                        <Mail className="w-5 h-5 opacity-50" />
                        Send an Email
                    </Button>
                </div>
            </section>

            {/* Footer Branding */}
            <footer className="py-12 px-4 border-t border-white/5 text-center">
                <p className="text-xs uppercase tracking-[0.5em] font-bold text-white/20">
                    SmartBiz AI Connect • Creativex Lab
                </p>
            </footer>
        </div>
    );
};

const LogicFeature = ({ icon: Icon, title, desc }: any) => (
    <div className="flex gap-4 items-start group">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
            <Icon className="w-5 h-5" />
        </div>
        <div>
            <h4 className="font-bold text-sm mb-1">{title}</h4>
            <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
        </div>
    </div>
);

const ProblemItem = ({ title, stat, desc }: any) => (
    <div className="flex gap-4 items-start bg-white/5 p-6 rounded-2xl border border-white/5">
        <div className="text-3xl font-bold text-primary">{stat}</div>
        <div>
            <h4 className="font-bold text-lg mb-1">{title}</h4>
            <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
        </div>
    </div>
);

const ROICard = ({ title, val, desc }: any) => (
    <div className="bg-white p-8 rounded-3xl shadow-2xl">
        <p className="text-sm uppercase tracking-widest font-bold text-primary mb-2">{title}</p>
        <p className="text-5xl font-display font-black mb-4">{val}</p>
        <p className="text-sm text-black/60 font-medium">{desc}</p>
    </div>
);

const SystemLogicCard = ({ icon: Icon, title, description }: any) => (
    <div className="p-8 rounded-2xl border border-white/5 bg-white/5 hover:bg-primary/5 hover:border-primary/20 transition-all group">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-primary" />
        </div>
        <h4 className="font-bold text-xl mb-2">{title}</h4>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>
    </div>
);

const DashboardFeatureCard = ({ title, desc }: any) => (
    <div className="p-4 rounded-xl border border-white/5 bg-white/5 flex gap-4">
        <div className="w-1.5 h-full rounded-full bg-blue-500" />
        <div>
            <h4 className="font-bold text-base">{title}</h4>
            <p className="text-xs text-white/40">{desc}</p>
        </div>
    </div>
);

const EcosystemCard = ({ icon: Icon, title, desc }: any) => (
    <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/20 transition-all text-center group">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
            <Icon className="w-6 h-6 text-primary" />
        </div>
        <h4 className="font-bold text-lg mb-2">{title}</h4>
        <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
    </div>
);

const PricingCard = ({ tag, ideal, price, features, featured }: any) => (
    <div className={cn(
        "p-8 rounded-3xl border transition-all duration-300",
        featured ? "bg-primary border-primary shadow-2xl shadow-primary/20 scale-105" : "bg-white/5 border-white/10"
    )}>
        <Badge className={cn("mb-4", featured ? "bg-white text-primary" : "bg-primary")}>{tag}</Badge>
        <p className={cn("text-xs font-bold uppercase tracking-widest mb-6", featured ? "text-white/70" : "text-white/30")}>{ideal}</p>
        <div className="mb-8">
            <span className="text-4xl font-extrabold">{price}</span>
            {price.includes("Rs") && <span className="text-sm opacity-60"> / mo</span>}
        </div>
        <ul className="space-y-4 mb-8">
            {features.map((f: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                    <ShieldCheck className={cn("w-4 h-4", featured ? "text-white" : "text-primary")} />
                    <span className={featured ? "text-white" : "text-white/70"}>{f}</span>
                </li>
            ))}
        </ul>
        <Button className={cn(
            "w-full h-12 rounded-xl font-bold",
            featured ? "bg-white text-primary hover:bg-white/90" : "bg-primary text-white"
        )}>
            Select Plan
        </Button>
    </div>
);

const RoadmapItem = ({ step, title, days, desc }: any) => (
    <div className="flex gap-8 group">
        <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center font-display font-black text-2xl text-primary group-hover:bg-primary group-hover:text-white transition-all">
                {step}
            </div>
            <div className="flex-1 w-px bg-white/10 my-4" />
        </div>
        <div className="pb-12">
            <div className="flex items-center gap-4 mb-2">
                <h4 className="text-2xl font-bold font-display">{title}</h4>
                <Badge className="bg-primary/20 text-primary border-none">{days}</Badge>
            </div>
            <p className="text-white/40 leading-relaxed">{desc}</p>
        </div>
    </div>
);

export default VisualProposal;
