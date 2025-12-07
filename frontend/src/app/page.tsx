"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaperUploader } from "@/components/PaperUploader";
import { useLanguage } from "@/lib/i18n";
import {
  Moon,
  Sun,
  FileText,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  Mic,
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  Scale,
  Shield,
  Globe,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  const agents = [
    {
      key: "skeptic" as const,
      icon: AlertTriangle,
      bgGradient: "bg-black",
    },
    {
      key: "statistician" as const,
      icon: BarChart3,
      bgGradient: "bg-black",
    },
    {
      key: "methodologist" as const,
      icon: Scale,
      bgGradient: "bg-black",
    },
    {
      key: "ethicist" as const,
      icon: Shield,
      bgGradient: "bg-black",
    },
  ];

  const featureKeys = ["voice", "multiAgent", "blockchain", "instant"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 gradient-mesh opacity-40 pointer-events-none" />
      <div className="fixed inset-0 grid-background opacity-30 pointer-events-none" />

      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/80 backdrop-blur-xl border-b border-border shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <FileText className="h-6 w-6 text-primary" />
                  <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Adversarial Science
                </span>
              </div>
              <div className="hidden md:flex items-center gap-6">
                <a
                  href="#how-it-works"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  {t.nav.howItWorks}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                </a>
                <a
                  href="#tribunal"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  {t.nav.theTribunal}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
                </a>
                <Link
                  href="/interactive"
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex items-center gap-1"
                >
                  <Mic className="h-4 w-4" />
                  {t.nav.liveMode}
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {t.nav.dashboard}
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-1 text-sm"
                aria-label="Toggle language"
              >
                <Globe className="w-4 h-4" />
                <span className="font-medium">{language === "en" ? "EN" : "中"}</span>
              </button>
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {theme === "dark" ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </button>
              )}
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
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="px-4 py-4 space-y-3">
              <a
                href="#how-it-works"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {t.nav.howItWorks}
              </a>
              <a
                href="#tribunal"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                {t.nav.theTribunal}
              </a>
              <Link
                href="/interactive"
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium"
              >
                <Mic className="h-4 w-4" />
                {t.nav.liveMode}
              </Link>
              <Link
                href="/dashboard"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t.nav.dashboard}
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main>
        <section className="relative pt-20 pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-screen flex items-center">
          <div className="absolute inset-0 radial-glow opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,119,198,0.2),transparent_50%)]" />

          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-primary/30 rounded-full blur-sm animate-float"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${10 + (i % 3) * 30}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: `${4 + i}s`,
                }}
              />
            ))}
          </div>

          <div className="relative max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <Badge variant="secondary">{t.hero.badge}</Badge>
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance">
                  {t.hero.title}
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed text-pretty">
                  {t.hero.subtitle}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform gap-2"
                    onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    <Mic className="w-4 h-4" />
                    {t.hero.startTribunal}
                  </Button>
                  <Link href="/dashboard">
                    <Button
                      size="lg"
                      variant="outline"
                      className="hover:scale-105 transition-all duration-300 bg-background/80 backdrop-blur-sm border-2 hover:border-primary/50 gap-2 w-full sm:w-auto"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {t.hero.viewDashboard}
                    </Button>
                  </Link>
                </div>

                <div className="flex flex-wrap gap-6 pt-8 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-sm text-muted-foreground">{t.hero.stats.experts}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
                    <span className="text-sm text-muted-foreground">{t.hero.stats.blockchain}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: "1s" }} />
                    <span className="text-sm text-muted-foreground">{t.hero.stats.instant}</span>
                  </div>
                </div>
              </div>

              <div className="relative" id="upload">
                <PaperUploader />
              </div>
            </div>
          </div>
        </section>

        <section id="tribunal" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <Badge variant="outline" className="mb-4">{t.tribunal.badge}</Badge>
              <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {t.tribunal.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.tribunal.subtitle}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {agents.map((agent, i) => {
                const Icon = agent.icon;
                const agentT = t.tribunal.agents[agent.key];
                return (
                  <Card
                    key={agent.key}
                    className={`p-6 card-hover-glow relative overflow-hidden group border-2 transition-all duration-300 ${
                      i % 2 === 0 ? "lg:animate-fade-in-up" : "lg:animate-fade-in-up"
                    }`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className={`absolute inset-0 ${agent.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative space-y-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${agent.bgGradient} shrink-0`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <h3 className="text-lg font-semibold">{agentT.name}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {agentT.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
          <div className="relative max-w-7xl mx-auto">
            <div className="text-center space-y-4 mb-16">
              <Badge variant="outline" className="mb-4">{t.howItWorks.badge}</Badge>
              <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {t.howItWorks.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t.howItWorks.subtitle}
              </p>
            </div>

            <div className="relative max-w-4xl mx-auto">
              <div className="space-y-12">
                {featureKeys.map((key, i) => {
                  const feature = t.howItWorks.features[key];
                  const isEven = i % 2 === 0;

                  return (
                    <div
                      key={key}
                      className="relative flex items-center gap-8 group"
                      style={{ animationDelay: `${i * 150}ms` }}
                    >
                      <div className="hidden md:flex shrink-0 w-16 h-16 items-center justify-center relative z-10">
                        <div className="absolute w-6 h-6 rounded-full bg-primary ring-4 ring-background group-hover:scale-125 transition-transform" />
                        <div className="absolute w-6 h-6 rounded-full bg-primary/20 group-hover:scale-150 transition-transform" />
                      </div>

                      <Card className={`flex-1 card-hover-glow border-2 relative overflow-hidden ${
                        isEven ? "md:ml-0" : "md:ml-24"
                      }`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardContent className="p-6 relative">
                          <div className="flex items-start gap-4">
                            <div className="shrink-0 w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/25 group-hover:scale-110 transition-transform">
                              {i + 1}
                            </div>

                            <div className="flex-1 space-y-2">
                              <CardTitle className="text-xl">{feature.title}</CardTitle>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 via-transparent to-primary/5" />
          <div className="relative max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold">{t.problem.broken}</h2>
                </div>
                <div className="space-y-4">
                  {t.problem.issues.map((text, i) => (
                    <Card
                      key={i}
                      className="p-4 card-hover-glow border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-all duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-start gap-3">
                        <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{text}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-3xl sm:text-4xl font-bold">{t.problem.solution}</h2>
                </div>
                <div className="space-y-4">
                  {t.problem.fixes.map((text, i) => (
                    <Card
                      key={i}
                      className="p-4 card-hover-glow border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all duration-300"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
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
              {t.cta.title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.cta.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 hover:scale-105 transition-transform gap-2"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              >
                <Mic className="w-5 h-5" />
                {t.hero.startTribunal}
              </Button>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  variant="outline"
                  className="hover:scale-105 transition-transform gap-2 w-full sm:w-auto"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  {t.cta.viewPast}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t border-border relative">
        <div className="absolute inset-0 bg-gradient-to-t from-muted/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-semibold">Adversarial Science</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {t.footer.builtFor}
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="hover:text-foreground transition-colors">Neo Blockchain</span>
              <span className="hover:text-foreground transition-colors">Mem0 Memory</span>
              <span className="hover:text-foreground transition-colors">ElevenLabs</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
