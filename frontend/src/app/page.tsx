"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaperUploader } from "@/components/PaperUploader";
import {
  Moon,
  Sun,
  FileText,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Mic,
} from "lucide-react";

const agents = [
  {
    name: "The Skeptic",
    description: "Questions everything, finds alternative explanations",
  },
  {
    name: "The Statistician",
    description: "Audits numbers, catches p-hacking and statistical errors",
  },
  {
    name: "The Methodologist",
    description: "Evaluates experimental design and methodology",
  },
  {
    name: "The Ethicist",
    description: "Identifies bias, conflicts of interest, and ethical issues",
  },
];

const features = [
  {
    title: "Voice Conversation",
    description: "Speak naturally with agents and hear their responses aloud",
  },
  {
    title: "Multi-Agent Analysis",
    description: "Four specialized AI agents analyze your paper from different perspectives",
  },
  {
    title: "Blockchain Verified",
    description: "Verdicts stored immutably on Neo blockchain + AIOZ storage",
  },
  {
    title: "Instant Results",
    description: "Get comprehensive analysis in minutes, not weeks",
  },
];

export default function HomePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-lg border-b border-border"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <span className="text-xl font-bold">Adversarial Science</span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <a
                  href="#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  How it works
                </a>
                <a
                  href="#tribunal"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  The Tribunal
                </a>
                <a
                  href="/interactive"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
                >
                  <Mic className="h-4 w-4" />
                  Live Mode
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#how-it-works"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                How it works
              </a>
              <a
                href="#tribunal"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                The Tribunal
              </a>
              <a
                href="/interactive"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Mic className="h-4 w-4" />
                Live Mode
              </a>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 grid-background opacity-50" />
          <div className="absolute inset-0 radial-glow" />

          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <Badge variant="secondary">SpoonOS + Neo Hackathon</Badge>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  AI Tribunal for Research Validation
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed text-pretty">
                  Have a live voice conversation with four AI agents who adversarially
                  debate and critique your research paper. Speak naturally, get instant feedback.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform gap-2"
                    onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <Mic className="w-4 h-4" />
                    Start Voice Tribunal
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="hover:scale-105 transition-transform bg-transparent"
                    onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    See how it works
                  </Button>
                </div>
              </div>

              <div className="relative" id="upload">
                <PaperUploader />
              </div>
            </div>
          </div>
        </section>

        <section id="tribunal" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold">The Tribunal</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Four specialized agents analyze and debate your paper in real-time
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {agents.map((agent, i) => (
                <Card
                  key={agent.name}
                  className="p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
                >
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                      {i + 1}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-4xl font-bold">How It Works</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                A natural voice conversation that delivers rigorous analysis
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, i) => (
                <Card
                  key={feature.title}
                  className="relative p-6 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300"
                >
                  <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                    {i + 1}
                  </div>
                  <CardHeader className="p-0 pt-4 mb-3">
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold">Peer review is broken.</h2>
                <div className="space-y-4">
                  {[
                    "70% of studies fail to replicate",
                    "Reviewers miss critical statistical errors",
                    "Conflicts of interest go undetected",
                  ].map((text, i) => (
                    <Card key={i} className="p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-3xl font-bold">Adversarial Science fixes that.</h2>
                <div className="space-y-4">
                  {[
                    "Have a real conversation with AI reviewers",
                    "Ask follow-up questions and get instant answers",
                    "Verdicts are stored immutably on blockchain",
                  ].map((text, i) => (
                    <Card key={i} className="p-4 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-balance">
              Start a live tribunal conversation.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Upload your paper and speak directly with the AI agents. They'll analyze, debate, and answer your questions.
            </p>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform gap-2"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <Mic className="w-5 h-5" />
              Start Voice Tribunal
            </Button>
          </div>
        </section>
      </main>

      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <span className="font-semibold">Adversarial Science</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built for SpoonOS + Neo Agentic Hackathon
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Neo Blockchain</span>
              <span>AIOZ Storage</span>
              <span>ElevenLabs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
