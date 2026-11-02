"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Message {
  id: string;
  sender: "assistant" | "user";
  text: string;
}

interface Option {
  label: string;
  value: string;
}

interface HeroConversationalCardProps {
  initialOptions: Option[];
}

/** Matches the slug normalization used by the /services catalog routes. */
function categorySlug(name: string) {
  return name.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-").replace(/[-_]+/g, "-");
}

export default function HeroConversationalCard({ initialOptions }: HeroConversationalCardProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "assistant",
      text: "Hi! Welcome to PHS Cleaning Company. I can help you find the right home service in seconds. What do you need help with today?",
    },
  ]);
  const [options, setOptions] = useState<Option[]>(() => initialOptions);
  const [step, setStep] = useState<"initial" | "selected_service" | "pincode_check" | "results">("initial");
  const [selectedService, setSelectedService] = useState<string>("");
  const [pincode, setPincode] = useState<string>("");
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll messages container to bottom when messages or options change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, options, isTyping]);

  const simulateAssistantResponse = (text: string, nextOptions: Option[], nextStep: typeof step, delay = 1000) => {
    setIsTyping(true);
    setOptions([]);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "assistant",
          text,
        },
      ]);
      setOptions(nextOptions);
      setStep(nextStep);
    }, delay);
  };

  const handleOptionClick = (option: Option) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "user",
        text: option.label,
      },
    ]);

    if (step === "initial") {
      if (option.value === "__all__") {
        simulateAssistantResponse(
          "Let's find the right service for you — browse everything we offer below.",
          [],
          "results",
          600
        );
        return;
      }

      setSelectedService(option.value);
      simulateAssistantResponse(
        `Great choice! We have verified experts for ${option.label}. Would you like to check serviceability for your pincode or browse the services right away?`,
        [
          { label: "Check my pincode", value: "check_pincode" },
          { label: "Browse all services", value: "browse_all" },
          { label: "Start over", value: "restart" },
        ],
        "selected_service"
      );
    } else if (step === "selected_service") {
      if (option.value === "check_pincode") {
        simulateAssistantResponse(
          "Sure! Enter your 6-digit pincode and we'll carry it over to checkout, where availability is confirmed for your address.",
          [],
          "pincode_check"
        );
      } else if (option.value === "browse_all") {
        simulateAssistantResponse(
          "Excellent! Use the button below to browse our offerings and book instantly.",
          [],
          "results"
        );
      } else if (option.value === "restart") {
        handleReset();
      }
    }
  };

  const handlePincodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeStatus("error");
      return;
    }

    setPincodeStatus("checking");

    setTimeout(() => {
      setPincodeStatus("success");
      simulateAssistantResponse(
        `Got it — ${pincode}. We'll confirm professional availability for this pincode at checkout. Browse the services to continue.`,
        [],
        "results",
        800
      );
    }, 1200);
  };

  const handleReset = () => {
    setMessages([
      {
        id: "restart_msg",
        sender: "assistant",
        text: "Hi again! What home service can we help you with today?",
      },
    ]);
    setOptions(initialOptions);
    setStep("initial");
    setSelectedService("");
    setPincode("");
    setPincodeStatus("idle");
  };

  // Get link destination depending on selected service category
  const getBookingLink = () => {
    if (selectedService && selectedService !== "__all__") {
      return `/services/${categorySlug(selectedService)}`;
    }
    return "/services";
  };

  return (
    <div className="relative rounded-4xl overflow-hidden h-[380px] shadow-ambient-hover w-full group transform-3d hover:rotate-y-2 hover:-rotate-x-2 transition-transform duration-700 ease-out flex flex-col">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/90 to-primary-container"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,var(--color-secondary)_0%,transparent_60%)] opacity-20"></div>

      {/* Header of Chat Card */}
      <div className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-full bg-linear-to-tr from-secondary to-secondary/70 flex items-center justify-center text-primary shadow-md">
            <span className="material-symbols-outlined text-[18px]" aria-hidden>support_agent</span>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-primary animate-pulse" aria-hidden></span>
          </div>
          <div>
            <p className="text-sm font-extrabold text-white leading-tight">Priya</p>
            <p className="text-[11px] text-white/70 font-semibold">PHS Cleaning Company Assistant</p>
          </div>
        </div>

        {step !== "initial" && (
          <button
            onClick={handleReset}
            className="text-[11px] font-bold text-secondary hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[12px]" aria-hidden>refresh</span> Reset
          </button>
        )}
      </div>

      {/* Messages Box Area */}
      <div ref={chatContainerRef} className="relative z-10 flex-1 overflow-y-auto px-6 py-4 space-y-3.5 no-scrollbar scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-[slideDown_0.2s_ease-out]`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium leading-relaxed ${
                msg.sender === "user"
                  ? "bg-secondary text-primary rounded-tr-none shadow-md shadow-secondary/15"
                  : "bg-white/10 text-white border border-white/5 rounded-tl-none"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/10 text-white border border-white/5 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
      </div>

      {/* Action / Input Footer Area */}
      <div className="relative z-20 p-5 bg-black/10 border-t border-white/5 backdrop-blur-xs flex flex-col justify-end">
        {/* Dynamic options chips */}
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-[slideDown_0.2s_ease-out]">
            {options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleOptionClick(opt)}
                className="bg-white/5 hover:bg-white/15 active:scale-95 border border-white/10 text-white hover:border-secondary hover:text-secondary px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Pincode Submission Form */}
        {step === "pincode_check" && pincodeStatus !== "success" && (
          <form onSubmit={handlePincodeSubmit} className="flex gap-2 w-full animate-[slideDown_0.2s_ease-out]">
            <label htmlFor="hero-pincode" className="sr-only">
              Pincode
            </label>
            <input
              id="hero-pincode"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value.replace(/\D/g, ""));
                if (pincodeStatus === "error") setPincodeStatus("idle");
              }}
              placeholder="Enter 6-digit pincode"
              className="flex-1 bg-white/10 border border-white/10 focus:border-secondary focus:ring-1 focus:ring-secondary rounded-full px-4 py-2 text-xs font-semibold text-white placeholder-white/40 outline-hidden"
              disabled={pincodeStatus === "checking"}
            />
            <button
              type="submit"
              disabled={pincodeStatus === "checking"}
              className="bg-secondary text-primary hover:scale-105 active:scale-95 px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              {pincodeStatus === "checking" ? "Saving..." : "Submit"}
            </button>
          </form>
        )}

        {/* Error message for invalid pincode */}
        {pincodeStatus === "error" && (
          <p className="text-[11px] text-error font-bold mt-2 ml-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" aria-hidden>error</span>
            Please enter a valid 6-digit numeric pincode.
          </p>
        )}

        {/* Results Booking Button */}
        {step === "results" && (
          <div className="w-full flex flex-col gap-2 animate-[slideDown_0.2s_ease-out]">
            <Link
              href={getBookingLink()}
              className="bg-linear-to-r from-secondary to-secondary/70 text-primary px-6 py-3 rounded-full text-center text-xs font-extrabold hover:scale-103 active:scale-97 shadow-lg shadow-secondary/30 transition-all block"
            >
              Browse Services
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
