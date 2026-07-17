"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = [
  {
    q: "How does Gomen protect the current password?",
    a: "The current password of every account is encrypted at rest with AES-256-GCM. The encryption key lives only in server-side environment variables. Even if the database were leaked, the ciphertexts cannot be decrypted without the key. The password is only ever decrypted server-side, after a verified Razorpay payment and a valid one-time unlock token.",
  },
  {
    q: "Can I view the current password without paying?",
    a: "No. The current password is never sent to the browser, never rendered via CSS, and never appears in the page source. The only way to retrieve it is through the verified payment flow that mints a single-use unlock token.",
  },
  {
    q: "What happens after I pay?",
    a: "Once Razorpay verifies your payment server-side, Gomen mints a random 64-character unlock token, valid for 10 minutes. You are redirected to /unlock?token=… where the token is verified and the password is revealed exactly once. After the reveal, the token is marked used — refreshing the page shows a 'token already used' message.",
  },
  {
    q: "What if I refresh the unlock page?",
    a: "After a successful reveal, the token is permanently marked as used. Refreshing the page, sharing the URL, or opening it in another tab will all show the 'token has already been used' page. Make sure to copy your password immediately.",
  },
  {
    q: "Which payment methods are supported?",
    a: "All payment methods supported by Razorpay — UPI, cards, netbanking, wallets, and EMI — work out of the box. Payment verification is always done server-side via signature check, never trusted from the frontend.",
  },
  {
    q: "Do I need to create an account?",
    a: "No. Customers never need to sign up or log in. You only need to search, pay, and unlock. The only login on Gomen is for admins who manage the account catalogue.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQ.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-left text-base">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
