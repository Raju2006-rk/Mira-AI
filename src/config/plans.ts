/**
 * Subscription plans are configuration, not hardcoded logic (spec §49).
 * Prices, currency, and feature gating live here so they can be changed or
 * loaded from a billing provider later without touching UI code.
 */
export interface Plan {
  id: string;
  name: string;
  priceLabel: string; // display only; real billing wires up later
  tagline: string;
  features: string[];
  highlighted?: boolean;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "₹0",
    tagline: "Start speaking without fear",
    features: [
      "Daily practice with Mira",
      "Basic AI conversation",
      "What Should I Say? & Fix My English",
      "Personal Mistake Book",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    priceLabel: "₹—/mo",
    tagline: "For serious, faster progress",
    highlighted: true,
    features: [
      "Everything in Free",
      "Extended AI conversations",
      "Advanced roleplay & interview simulator",
      "Detailed progress & personalized plan",
      "Advanced pronunciation feedback",
    ],
  },
];
