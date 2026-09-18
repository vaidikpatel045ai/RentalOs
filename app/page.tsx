import { SiteHeader } from "@/components/marketing/site-header";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { LifecycleSection } from "@/components/marketing/lifecycle-section";
import { PortalsSection } from "@/components/marketing/portals-section";
import { IntelligenceSection } from "@/components/marketing/intelligence-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FaqSection } from "@/components/marketing/faq-section";
import { InquirySection } from "@/components/marketing/inquiry-section";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <LifecycleSection />
        <PortalsSection />
        <IntelligenceSection />
        <PricingSection />
        <FaqSection />
        <InquirySection />
      </main>
      <SiteFooter />
    </div>
  );
}
