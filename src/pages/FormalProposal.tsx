import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Mail, Phone, Settings2, Upload, RotateCcw, TrendingUp, Users, Globe } from "lucide-react";
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

const FormalProposal = () => {
    const [customImages, setCustomImages] = useState({
        dashboard: "/dashboard_ui_presentation_1771051945709.png",
        voice: "/ai_voice_agent_mockup_1771051579251.png",
        whatsapp: "/whatsapp_ai_process_visual_v2_1771051968210.png",
        vision: "/ai_vision_mockup.png"
    });

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof customImages) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomImages(prev => ({ ...prev, [key]: reader.result as string }));
            };
            reader.readAsDataURL(file);
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
        <div className="bg-white min-h-screen py-12 px-4 md:px-0">
            <div className="max-w-[800px] mx-auto bg-white shadow-xl border border-gray-100 p-12 rounded-lg print:shadow-none print:border-none print:p-0">
                
                {/* PAGE 1: COVER & EXECUTIVE SUMMARY */}
                <header className="border-b-4 border-blue-600 pb-8 mb-12 flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Mohan Trader CRM</h1>
                        <p className="text-blue-600 font-bold uppercase tracking-widest text-sm">Strategic Business Proposal</p>
                    </div>
                    <div className="text-right text-sm text-gray-500 font-medium">
                        <p>February 14, 2026</p>
                        <p>Creativex Lab</p>
                    </div>
                </header>

                <div className="space-y-12 text-gray-800 leading-relaxed">
                    
                    <section className="print:break-after-page">
                        <h2 className="text-2xl font-bold text-blue-600 border-l-4 border-blue-600 pl-4 mb-6">1. Executive Summary</h2>
                        <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 mb-8">
                            <p className="text-xl font-medium text-blue-900 mb-4">The Solution to Modern Retail Leakage</p>
                            <p className="text-gray-700">
                                Mohan Trader CRM is a <span className="highlight font-bold">Sustainable Market Advantage</span>. While competitors hire more staff to handle growth, our partners use <strong>Multimodal Intelligence</strong> to scale infinitely. We solve the three biggest leaks in retail: Missed Calls, Slow Replies, and Lost Retargeting. This proposal outlines a transformation from variable labor costs to fixed digital efficiency.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-blue-600 font-black text-2xl mb-1">0.2s</p>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Response Latency</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                <p className="text-green-600 font-black text-2xl mb-1">100%</p>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Inquiry Capture</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Core Intelligence Pillars</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900 text-sm">Multimodal Intent Engine</p>
                                    <p className="text-[11px] text-gray-500">Autonomous processing of Text, Voice, and Images to determine buyer intent instantly.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900 text-sm">Autonomous Transaction Control</p>
                                    <p className="text-[11px] text-gray-500">End-to-end order processing—from stock check to payment link—without human intervention.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900 text-sm">Predictive Revenue Retrieval</p>
                                    <p className="text-[11px] text-gray-500">Intelligent abandoned cart recovery bots that target lost customers with high-conversion nudges.</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-gray-900 text-sm">Enterprise Data Verification</p>
                                    <p className="text-[11px] text-gray-500">Fraud-proof computer vision that validates payment slips against real-time bank metadata.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* PAGE 2: CORE ECOSYSTEM & CHANNELS */}
                    <section className="print:break-after-page">
                        <h2 className="text-2xl font-bold text-blue-600 border-l-4 border-blue-600 pl-4 mb-8">2. The Intelligent Business Ecosystem</h2>
                        
                        <div className="mb-12">
                            <h3 className="text-xl font-bold mb-4 text-gray-900">2.1. Central AI Brain (ERP & Operations)</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="border border-gray-100 p-6 rounded-2xl bg-white shadow-sm">
                                    <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-tighter">Stock Intelligence</h4>
                                    <p className="text-gray-600 text-xs">Real-time inventory sync across WhatsApp, Voice, and physical branches to prevent out-of-stock orders.</p>
                                </div>
                                <div className="border border-gray-100 p-6 rounded-2xl bg-white shadow-sm">
                                    <h4 className="text-sm font-bold text-blue-600 mb-2 uppercase tracking-tighter">Smart Logistics</h4>
                                    <p className="text-gray-600 text-xs">Automated delivery fee calculation and partner routing based on customer location.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div>
                                <h3 className="text-xl font-bold mb-4 text-gray-900">2.2. Omni-Channel Dominance</h3>
                                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-lg">Sinhala/Tamil Voice AI</h4>
                                        <Badge className="bg-blue-600 text-white border-none">Direct ROI</Badge>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-4">A human-like voice agent that takes orders, checks stock, and answers questions in local languages without any staff involvement.</p>
                                    <div className="flex justify-center">
                                        <img src={customImages.voice} className="max-w-[40%] rounded-xl shadow-lg border border-gray-200" alt="Voice Agent" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* PAGE 3: MARKETING ENGINE */}
                    <section className="print:break-after-page">
                        <h2 className="text-2xl font-bold text-blue-600 border-l-4 border-blue-600 pl-4 mb-8">3. Marketing Intelligence & Growth</h2>
                        
                        <div className="grid grid-cols-2 gap-6 mb-12">
                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                                    <RotateCcw className="text-white w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-gray-900 mb-2 text-sm">Abandoned Cart Recovery</h4>
                                <p className="text-[10px] text-blue-600 font-bold mb-2 uppercase">+40% REVENUE</p>
                                <p className="text-xs text-gray-500">AI automatically follows up with WhatsApp users who leave items in the cart, converting lost interest into paid sales.</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                                    <TrendingUp className="text-white w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-gray-900 mb-2 text-sm">Dynamic AI Upselling</h4>
                                <p className="text-[10px] text-blue-600 font-bold mb-2 uppercase">SMART-LINK TECH</p>
                                <p className="text-xs text-gray-500">Intelligently suggests matching products and bundles based on customer history and current intent.</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100">
                            <h3 className="font-bold text-lg mb-4">Social Commerce Automation</h3>
                            <p className="text-sm text-gray-600 mb-6">WhatsApp and Telegram bots act as personal shoppers, maintaining a unified cart and synced customer profile across every chat platform.</p>
                            <div className="flex justify-center">
                                <img src={customImages.whatsapp} className="max-w-[40%] rounded-xl shadow-lg border border-gray-200" alt="WhatsApp Automation" />
                            </div>
                        </div>
                    </section>

                    {/* PAGE 4: SECURITY & COMMAND CENTER */}
                    <section className="print:break-after-page">
                        <h2 className="text-2xl font-bold text-blue-600 border-l-4 border-blue-600 pl-4 mb-8">4. Strategic Security & Command</h2>
                        
                        <div className="bg-blue-900 text-white p-8 rounded-3xl mb-8 relative overflow-hidden">
                            <h3 className="text-xl font-bold mb-6">Fraud-Proof Financial Defense</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <p className="font-bold text-sm text-blue-200 uppercase">Computer Vision AI</p>
                                    <p className="text-xs text-blue-100">Instantly detects pixel manipulation and duplicate IDs in banking slips to reject fraudulent payments automatically.</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-bold text-sm text-blue-200 uppercase">Data Sovereignty</p>
                                    <p className="text-xs text-blue-100">All customer logs and transaction data are encrypted and stored in your private, secure business environment.</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-2xl">
                            <h3 className="text-xl font-bold mb-6">Real-Time Command Dashboard</h3>
                            <div className="flex justify-center mb-8">
                                <img src={customImages.dashboard} className="max-w-[60%] rounded-xl shadow-2xl" alt="Dashboard" />
                            </div>
                            <div className="grid grid-cols-3 gap-6 text-center border-t border-white/10 pt-6">
                                <div>
                                    <p className="text-blue-400 font-black text-xl">98%</p>
                                    <p className="text-[10px] text-white/40 uppercase font-bold">Bot Accuracy</p>
                                </div>
                                <div>
                                    <p className="text-blue-400 font-black text-xl">24/7</p>
                                    <p className="text-[10px] text-white/40 uppercase font-bold">Active Shield</p>
                                </div>
                                <div>
                                    <p className="text-blue-400 font-black text-xl">0.2s</p>
                                    <p className="text-[10px] text-white/40 uppercase font-bold">Sync Latency</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* PAGE 5: ROADMAP, ROI & INVESTMENT */}
                    <section className="print:break-after-page">
                        <h2 className="text-2xl font-bold text-blue-600 border-l-4 border-blue-600 pl-4 mb-8">5. The Success Path & Investment</h2>
                        
                        <div className="mb-12">
                            <h3 className="font-bold text-gray-900 mb-6">The 4-Day Success Blueprint</h3>
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { day: "D1", title: "Intelligence Mapping", desc: "Data Learn" },
                                    { day: "D2", title: "Neural Integration", desc: "API Link" },
                                    { day: "D3", title: "Quality Validation", desc: "Simulate" },
                                    { day: "D4", title: "Market Launch", desc: "Go Sync" }
                                ].map((step, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                                        <p className="text-blue-600 font-black text-lg">{step.day}</p>
                                        <p className="font-bold text-[10px] text-gray-900">{step.title}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-600 text-white p-10 rounded-[3rem] shadow-xl relative overflow-hidden">
                            <h3 className="text-3xl font-black mb-8 text-center italic tracking-tight">Investment Options</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20">
                                    <p className="font-bold text-xl mb-1 uppercase tracking-tighter">Growth</p>
                                    <p className="text-4xl font-black mb-2 tracking-tighter">Rs. 8,500 <span className="text-xs font-normal text-white/60">/mo</span></p>
                                    <ul className="text-[10px] space-y-2 mt-4 font-bold uppercase tracking-widest">
                                        <li>✓ WhatsApp/Telegram Bot</li>
                                        <li>✓ Inventory Sync</li>
                                        <li className="text-blue-300">✓ 24/7 TECHNICAL SUPPORT</li>
                                    </ul>
                                </div>
                                <div className="bg-white text-blue-600 p-6 rounded-2xl shadow-2xl relative">
                                    <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">MOST POPULAR</div>
                                    <p className="font-bold text-xl mb-1 uppercase tracking-tighter">Professional</p>
                                    <p className="text-4xl font-black mb-2 tracking-tighter text-blue-900">Rs. 25,000 <span className="text-xs font-normal text-gray-400">/mo</span></p>
                                    <ul className="text-[10px] space-y-2 mt-4 font-bold uppercase tracking-widest">
                                        <li>✓ Sinhala Voice Agent</li>
                                        <li>✓ Retail Retargeting</li>
                                        <li className="font-black underline decoration-2">✓ 24/7 TECHNICAL SUPPORT</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <footer className="pt-12 border-t border-gray-100 flex justify-between items-start text-sm text-gray-500">
                        <div className="space-y-1">
                            <p className="font-bold text-gray-900">Creativex Lab</p>
                            <p>Sri Lanka's Leader in Business AI</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="flex items-center justify-end gap-2"><Mail size={14} /> tkavishka101@gmail.com</p>
                            <p className="flex items-center justify-end gap-2"><Phone size={14} /> 070 337 5336</p>
                        </div>
                    </footer>
                </div>

                {/* Print & Designer Fab - Hidden for Client View */}
                <div className="fixed bottom-8 right-8 print:hidden flex flex-col gap-4 hidden">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="h-14 w-14 rounded-full shadow-2xl bg-white text-blue-600 hover:bg-blue-50 border border-gray-100">
                                <Settings2 className="w-6 h-6" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold text-blue-600">Document Designer</DialogTitle>
                                <DialogDescription className="text-gray-500">
                                    Replace the default AI mockups with real screenshots of your system.
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
                                        <Label className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400">{item.label}</Label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => handleImageUpload(e, item.id as any)}
                                            className="border-gray-100 h-11 file:text-blue-600 file:font-bold"
                                        />
                                    </div>
                                ))}

                                <div className="pt-4 flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-gray-100 hover:bg-gray-50 gap-2 h-12"
                                        onClick={resetToDefaults}
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                        Defaults
                                    </Button>
                                    <Button
                                        className="flex-1 bg-blue-600 text-white h-12"
                                        onClick={() => window.print()}
                                    >
                                        Print PDF
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    );
};

export default FormalProposal;
