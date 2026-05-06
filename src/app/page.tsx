// import Header from "@/components/Header";
// import Footer from "@/components/Footer";
// import Link from "next/link";
// import { createClient } from "@/utils/supabase/server";
// 

// export const dynamic = "force-dynamic";

// export default async function Home() {
//   const supabase = await createClient();
//   const { data: popularServices } = await supabase.from('services').select('*').limit(6);

//   // Derive unique categories from available services
//   const uniqueCategories = popularServices ? Array.from(new Set(popularServices.map(s => s.category))) : [];

//   // Icon mapper
//   const catIconMap: Record<string, string> = {
//     'cleaning': 'cleaning_services',
//     'repair': 'build',
//     'plumbing': 'plumbing',
//     'electrical': 'bolt',
//     'pest_control': 'pest_control',
//     'hvac': 'ac_unit',
//     'landscaping': 'grass'
//   };

//   // Image mapper for category cards
//   const catImageMap: Record<string, string> = {
//     'pest_control': '/assets/indian_pest_control_pro_1776155620526.png',
//     'cleaning': '/assets/hero_cleaning_1773410829223.png',
//     'electrical': '/assets/hero_ac_repair_1773410812102.png',
//     'hvac': '/assets/hero_ac_repair_1773410812102.png',
//     'plumbing': '/assets/banner_cleaning_1773410846591.png',
//     'landscaping': '/assets/indian_gardening_pro_1776693713648.png'
//   };

//   return (
//     <>
//       <Header />
//       <main>
//         {/* Section 1: Hero */}
//         <section className="relative pt-12 pb-16 px-4 md:pt-16 md:pb-24 md:px-6 lg:pt-20 lg:pb-32 overflow-hidden">
//           <div className="max-w-4xl mx-auto text-center relative z-10">
//             <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-surface-container rounded-full mb-6 md:mb-8">
//               <div className="flex -space-x-2">
//                 <Image
//                   alt=""
//                   className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white object-cover"
//                   src="/logo.jpg"
//                   width={24}
//                   height={24}
//                 />
//                 <Image
//                   alt=""
//                   className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 border-white object-cover"
//                   src="/assets/img_guarantee_1773412978355.png"
//                   width={24}
//                   height={24}
//                 />
//               </div>
//               <span className="text-xs md:text-sm font-medium text-on-surface-variant">
//                 4.8 Rating • 50k+ Verified Pros
//               </span>
//             </div>
//             <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold font-headline text-on-surface mb-5 md:mb-8 tracking-tight leading-tight">
//               Book Trusted <span className="text-primary">Home Services</span>{" "}
//               at Your Doorstep
//             </h1>
//             <p className="text-base md:text-lg lg:text-xl text-on-surface-variant mb-8 md:mb-12 max-w-2xl mx-auto">
//               Experience the sanctuary of a perfectly managed home. From
//               clinical deep cleaning to surgical AC repairs, we bring expert
//               care to your space.
//             </p>
//             <div className="max-w-2xl mx-auto relative">
//               <div className="flex flex-col sm:flex-row items-center bg-surface-container-lowest shadow-2xl rounded-xl p-2 gap-2">
//                 <div className="flex items-center w-full gap-2">
//                   <span
//                     className="material-symbols-outlined ml-3 sm:ml-4 text-outline"
//                     data-icon="search"
//                   >
//                     search
//                   </span>
//                   <input
//                     className="w-full bg-transparent border-none focus:ring-0 py-3 md:py-4 text-base md:text-lg outline-none"
//                     placeholder="Search for AC repair, cleaning..."
//                     type="text"
//                   />
//                 </div>
//                 <button className="w-full sm:w-auto bg-linear-to-r from-primary to-primary-container text-on-primary px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg hover:scale-[1.02] transition-transform shrink-0 cursor-pointer">
//                   Find Pro
//                 </button>
//               </div>
//             </div>
//           </div>
//           {/* Decorative Elements — hidden on mobile for perf */}
//           <div className="hidden md:block absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
//           <div className="hidden md:block absolute bottom-0 right-0 translate-x-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-3xl"></div>
//         </section>

//         {/* Section 2: Categories Grid (Dynamic) */}
//         {uniqueCategories.length > 0 && (
//           <section className="py-10 px-4 md:py-12 md:px-6 lg:py-16 bg-surface-container-low">
//             <div className="max-w-7xl mx-auto">
//               <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
//                 {uniqueCategories.map((cat, idx) => (
//                   <Link
//                     key={idx}
//                     href={`/search?q=${cat}`}
//                     className="bg-surface-container-lowest rounded-2xl group cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all border border-transparent hover:border-primary/20 flex overflow-hidden relative min-h-[120px] md:min-h-[140px]"
//                   >
//                     {/* Text Section */}
//                     <div className="p-4 md:p-6 flex-1 relative z-10 flex flex-col justify-center bg-linear-to-r from-surface-container-lowest via-surface-container-lowest to-transparent w-full h-full">
//                       <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 md:mb-4 group-hover:bg-primary group-hover:text-white transition-colors shadow-sm">
//                         <span className="material-symbols-outlined text-base md:text-lg">{catIconMap[cat] || 'home_repair_service'}</span>
//                       </div>
//                       <h3 className="font-bold text-on-surface mb-1 capitalize text-base md:text-lg tracking-tight z-20 drop-shadow-sm">{cat.replace('_', ' ')}</h3>
//                       <p className="text-xs text-on-surface-variant font-medium z-20">Explore Services</p>
//                     </div>

//                     {/* Image Section — hidden on mobile for performance */}
//                     <div className="hidden md:block absolute right-0 top-0 bottom-0 w-1/2 opacity-90 group-hover:opacity-100 transition-opacity">
//                       <Image
//                         src={catImageMap[cat] || '/assets/hero_cleaning_1773410829223.png'}
//                         className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
//                         style={{ transformOrigin: 'right center' }}
//                         alt={cat}
//                         fill
//                       />
//                       <div className="absolute inset-0 bg-linear-to-r from-white via-white/80 to-transparent"></div>
//                     </div>
//                   </Link>
//                 ))}
//               </div>
//             </div>
//           </section>
//         )}

//         {/* Section 3: Popular Services (Dynamic Carousel) */}
//         {popularServices && popularServices.length > 0 && (
//           <section className="py-12 px-4 md:py-16 md:px-6 lg:py-24 overflow-hidden bg-surface">
//             <div className="max-w-7xl mx-auto">
//               <div className="flex justify-between items-end mb-8 md:mb-12">
//                 <div>
//                   <h2 className="text-2xl md:text-3xl lg:text-4xl font-headline font-extrabold text-on-surface tracking-tight mb-2">
//                     Popular Services
//                   </h2>
//                   <p className="text-on-surface-variant text-sm md:text-base">
//                     Hand-picked experts for your home&apos;s most frequent needs.
//                   </p>
//                 </div>
//                 <div className="hidden md:flex gap-2">
//                   <button className="p-2.5 md:p-3 rounded-full border border-outline-variant hover:bg-surface-container transition-colors">
//                     <span className="material-symbols-outlined">chevron_left</span>
//                   </button>
//                   <button className="p-2.5 md:p-3 rounded-full border border-outline-variant hover:bg-surface-container transition-colors">
//                     <span className="material-symbols-outlined">chevron_right</span>
//                   </button>
//                 </div>
//               </div>

//               <div className="flex gap-4 md:gap-6 overflow-x-auto no-scrollbar pb-8 -mx-4 px-4 md:-mx-6 md:px-6">
//                 {popularServices.map((service) => (
//                   <Link
//                     key={service.id}
//                     href={`/services/${service.category}/${service.id}`}
//                     className="min-w-[260px] max-w-[260px] md:min-w-[300px] md:max-w-[300px] lg:min-w-[320px] lg:max-w-[320px] bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group flex flex-col"
//                   >
//                     <div className="h-40 md:h-48 overflow-hidden bg-surface-container relative">
//                       {service.image_url || catImageMap[service.category] ? (
//                         <Image
//                           className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
//                           src={service.image_url || catImageMap[service.category]}
//                           alt={service.title}
//                           fill
//                         />
//                       ) : (
//                         <div className="w-full h-full flex justify-center items-center text-surface-container-highest">
//                           <span className="material-symbols-outlined text-4xl">work</span>
//                         </div>
//                       )}
//                     </div>
//                     <div className="p-4 md:p-6 flex flex-col flex-1">
//                       <div className="flex justify-between items-start mb-3 md:mb-4">
//                         <h4 className="text-lg md:text-xl font-bold leading-tight">{service.title}</h4>
//                         <div className="flex items-center text-sm font-bold text-secondary">
//                           <span
//                             className="material-symbols-outlined text-sm mr-1"
//                             style={{ fontVariationSettings: "'FILL' 1" }}
//                           >
//                             star
//                           </span>
//                           4.9
//                         </div>
//                       </div>
//                       <div className="flex items-center gap-4 mb-4 md:mb-6 mt-auto">
//                         <span className="text-on-surface-variant text-sm flex items-center">
//                           <span className="material-symbols-outlined text-xs mr-1">
//                             schedule
//                           </span>
//                           {service.duration_minutes}m
//                         </span>
//                         <span className="text-on-surface-variant text-sm">•</span>
//                         <span className="text-primary font-bold">₹{service.base_price}</span>
//                       </div>
//                       <button className="w-full py-2.5 md:py-3 bg-secondary-container text-on-secondary-container font-bold rounded-xl hover:bg-secondary hover:text-white transition-all text-sm md:text-base">
//                         Book Now
//                       </button>
//                     </div>
//                   </Link>
//                 ))}
//               </div>
//             </div>
//           </section>
//         )}

//         {/* Section 4: How It Works */}
//         <section className="py-12 px-4 md:py-16 md:px-6 lg:py-24 bg-surface-container-low">
//           <div className="max-w-7xl mx-auto">
//             <h2 className="text-2xl md:text-3xl lg:text-4xl font-headline font-extrabold text-on-surface text-center mb-10 md:mb-16 tracking-tight">
//               How It Works
//             </h2>
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 lg:gap-12 relative">
//               {[
//                 { icon: "search_check", title: "Choose a Service", desc: "Select from a wide range of services and experts tailored to your needs." },
//                 { icon: "calendar_month", title: "Book Your Slot", desc: "Pick a date and time that works best for you. Instant confirmation guaranteed." },
//                 { icon: "task_alt", title: "Relax & Enjoy", desc: "Our pro arrives on time and gets the job done while you sit back and relax." },
//               ].map((step, idx) => (
//                 <div key={idx} className="text-center relative z-10">
//                   <div className="w-16 h-16 md:w-20 md:h-20 bg-primary-container rounded-full flex items-center justify-center text-white mx-auto mb-6 md:mb-8 shadow-lg">
//                     <span className="material-symbols-outlined text-2xl md:text-3xl">{step.icon}</span>
//                   </div>
//                   <h4 className="text-lg md:text-xl font-bold mb-3 md:mb-4">{step.title}</h4>
//                   <p className="text-on-surface-variant text-sm md:text-base">{step.desc}</p>
//                 </div>
//               ))}
//               <div className="hidden md:block absolute top-[40px] left-[20%] right-[20%] h-0.5 border-t-2 border-dashed border-outline-variant/30 z-0"></div>
//             </div>
//           </div>
//         </section>

//         {/* Section 5: Why Choose Us */}
//         <section className="py-12 px-4 md:py-16 md:px-6 lg:py-24 bg-surface-container-high">
//           <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
//             {[
//               { icon: "verified", title: "Verified Pros", desc: "Background checked and highly skilled professionals only." },
//               { icon: "payments", title: "Transparent Pricing", desc: "Upfront quotes with no hidden costs or surprise fees." },
//               { icon: "schedule", title: "On-Time Service", desc: "Punctuality is our priority. We value your time." },
//               { icon: "security", title: "Service Warranty", desc: "30-day guarantee on all services performed through our platform." },
//             ].map((feature, idx) => (
//               <div
//                 key={idx}
//                 className="bg-surface-container-lowest p-6 md:p-7 lg:p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow"
//               >
//                 <span className="material-symbols-outlined text-primary text-3xl md:text-4xl mb-4 md:mb-6">
//                   {feature.icon}
//                 </span>
//                 <h5 className="font-bold text-base md:text-lg mb-2 md:mb-3">{feature.title}</h5>
//                 <p className="text-sm text-on-surface-variant leading-relaxed">
//                   {feature.desc}
//                 </p>
//               </div>
//             ))}
//           </div>
//         </section>

//         {/* Section 6: Animated Testimonials */}
//         <section className="py-12 px-4 md:py-16 md:px-6 lg:py-24 overflow-hidden relative">
//           <div className="max-w-7xl mx-auto mb-10 md:mb-16 text-center">
//             <div className="inline-flex items-center gap-2 bg-surface-container-high px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold mb-4 md:mb-6 text-on-surface-variant">
//               <span className="material-symbols-outlined text-xs md:text-sm">sentiment_satisfied</span>
//               Our Testimonials
//             </div>
//             <h2 className="text-2xl md:text-4xl lg:text-5xl font-headline font-extrabold text-on-surface mb-4 md:mb-6 tracking-tight">
//               User reviews and feedback
//             </h2>
//             <p className="text-sm md:text-lg text-on-surface-variant max-w-2xl mx-auto">
//               See how Pawan Pest Service has transformed users experiences through their own words
//             </p>
//           </div>

//           <div
//             className="w-full flex-col flex gap-6 md:gap-8 relative"
//             style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
//           >
//             {/* Top Row: Left Marquee */}
//             <div className="flex gap-4 md:gap-6 w-max animate-marquee-left hover:[animation-play-state:paused]">
//               {[...[
//                 { n: "Neha", l: "Sector 57", t: "The service was simple and effective. It met my expectations without any hassle. Good overall experience.", i: "https://i.pravatar.cc/150?u=a" },
//                 { n: "Pradnyesh", l: "Suncity", t: "Great work, my home was left spotless and fresh. The cleaning was thorough, and I appreciated the attention to detail. I'll recommend it. 👍", i: "https://i.pravatar.cc/150?u=b" },
//                 { n: "Ridhi Saluja", l: "Sector 56", t: "The services have definitely improved from the first time. Preferences are kept as top priority. Thank you for making our lives easier!", i: "https://i.pravatar.cc/150?u=c" },
//                 { n: "Kirti", l: "Sector 56", t: "I'd say it was great value for money. The urgent request was handled well, without compromising quality. Very satisfied with the quick response.", i: "https://i.pravatar.cc/150?u=d" },
//               ], ...[
//                 { n: "Neha", l: "Sector 57", t: "The service was simple and effective. It met my expectations without any hassle. Good overall experience.", i: "https://i.pravatar.cc/150?u=a" },
//                 { n: "Pradnyesh", l: "Suncity", t: "Great work, my home was left spotless and fresh. The cleaning was thorough, and I appreciated the attention to detail. I'll recommend it. 👍", i: "https://i.pravatar.cc/150?u=b" },
//                 { n: "Ridhi Saluja", l: "Sector 56", t: "The services have definitely improved from the first time. Preferences are kept as top priority. Thank you for making our lives easier!", i: "https://i.pravatar.cc/150?u=c" },
//                 { n: "Kirti", l: "Sector 56", t: "I'd say it was great value for money. The urgent request was handled well, without compromising quality. Very satisfied with the quick response.", i: "https://i.pravatar.cc/150?u=d" }
//               ]].map((rv, i) => (
//                 <div key={`r1-${i}`} className="w-[280px] md:w-[340px] lg:w-[380px] shrink-0 bg-white border border-outline-variant/30 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm flex flex-col relative" style={{ backgroundImage: 'radial-gradient(var(--color-outline-variant) 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: '0 0' }}>
//                   <div className="absolute top-4 md:top-6 right-4 md:right-6 text-slate-300">
//                     <span className="material-symbols-outlined text-3xl md:text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
//                   </div>
//                   <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 relative z-10 bg-white/50 backdrop-blur-sm p-2 -m-2 rounded-xl w-max">
//                     <Image src={rv.i} alt={rv.n} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm bg-slate-100" width={48} height={48} />
//                     <div>
//                       <div className="font-bold text-slate-900 text-sm md:text-base">{rv.n}</div>
//                       <div className="text-xs md:text-sm font-bold text-slate-500">{rv.l}</div>
//                     </div>
//                   </div>
//                   <p className="text-slate-700 leading-relaxed font-medium bg-white/50 backdrop-blur-sm p-3 md:p-4 -mx-3 md:-mx-4 rounded-xl relative z-10 text-sm md:text-base">{rv.t}</p>
//                 </div>
//               ))}
//             </div>

//             {/* Bottom Row: Right Marquee — hidden on small mobile */}
//             <div className="hidden sm:flex gap-4 md:gap-6 w-max animate-marquee-right hover:[animation-play-state:paused]">
//               {[...[
//                 { n: "Rabia", l: "Suncity", t: "Really impressive compared to other platforms. The service was reliable and professional. Communication was clear and prompt—very pleased!", i: "https://i.pravatar.cc/150?u=e" },
//                 { n: "Ritika", l: "Sector 57", t: "Seamless experience from booking to completion. The staff was courteous, punctual, and did a fantastic job.", i: "https://i.pravatar.cc/150?u=f" },
//                 { n: "Sameer", l: "Sector 57", t: "Really liked your service, it was smooth, efficient, and just what I needed. Would definitely recommend to others. 🌟", i: "https://i.pravatar.cc/150?u=g" },
//                 { n: "Karishma", l: "Suncity", t: "Absolutely excellent service! The team was polite and professional. I would definitely love to use it again.", i: "https://i.pravatar.cc/150?u=h" }
//               ], ...[
//                 { n: "Rabia", l: "Suncity", t: "Really impressive compared to other platforms. The service was reliable and professional. Communication was clear and prompt—very pleased!", i: "https://i.pravatar.cc/150?u=e" },
//                 { n: "Ritika", l: "Sector 57", t: "Seamless experience from booking to completion. The staff was courteous, punctual, and did a fantastic job.", i: "https://i.pravatar.cc/150?u=f" },
//                 { n: "Sameer", l: "Sector 57", t: "Really liked your service, it was smooth, efficient, and just what I needed. Would definitely recommend to others. 🌟", i: "https://i.pravatar.cc/150?u=g" },
//                 { n: "Karishma", l: "Suncity", t: "Absolutely excellent service! The team was polite and professional. I would definitely love to use it again.", i: "https://i.pravatar.cc/150?u=h" }
//               ]].map((rv, i) => (
//                 <div key={`r2-${i}`} className="w-[280px] md:w-[340px] lg:w-[380px] shrink-0 bg-white border border-outline-variant/30 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm flex flex-col relative" style={{ backgroundImage: 'radial-gradient(var(--color-outline-variant) 1px, transparent 1px)', backgroundSize: '16px 16px', backgroundPosition: '0 0' }}>
//                   <div className="absolute top-4 md:top-6 right-4 md:right-6 text-slate-300">
//                     <span className="material-symbols-outlined text-3xl md:text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>format_quote</span>
//                   </div>
//                   <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 relative z-10 bg-white/50 backdrop-blur-sm p-2 -m-2 rounded-xl w-max">
//                     <Image src={rv.i} alt={rv.n} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover shadow-sm bg-slate-100" width={48} height={48} />
//                     <div>
//                       <div className="font-bold text-slate-900 text-sm md:text-base">{rv.n}</div>
//                       <div className="text-xs md:text-sm font-bold text-slate-500">{rv.l}</div>
//                     </div>
//                   </div>
//                   <p className="text-slate-700 leading-relaxed font-medium bg-white/50 backdrop-blur-sm p-3 md:p-4 -mx-3 md:-mx-4 rounded-xl relative z-10 text-sm md:text-base">{rv.t}</p>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </section>

//         {/* Section 7: Partner CTA */}
//         <section className="py-12 px-4 md:py-16 md:px-6 lg:py-24 bg-surface-container-lowest">
//           <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-8 md:gap-12 lg:gap-16">
//             <div className="flex-1 w-full">
//               <Image
//                 className="rounded-2xl md:rounded-3xl shadow-2xl object-cover w-full max-h-[280px] md:max-h-none md:h-full"
//                 src="/assets/img_pro_worker_1773412996892.png"
//                 alt="Partner"
//                 width={800}
//                 height={800}
//               />
//             </div>
//             <div className="flex-1">
//               <h2 className="text-2xl md:text-3xl lg:text-4xl font-headline font-extrabold text-on-surface mb-6 md:mb-8 tracking-tight">
//                 Earn with us as a Service Partner
//               </h2>
//               <ul className="space-y-4 md:space-y-6 mb-8 md:mb-12">
//                 {[
//                   { icon: "trending_up", title: "Boost Your Income", desc: "Access a steady stream of high-quality bookings in your area." },
//                   { icon: "event_available", title: "Flexible Schedule", desc: "Be your own boss. Work when you want, where you want." },
//                   { icon: "psychology", title: "Professional Training", desc: "Get trained by industry experts and sharpen your technical skills." },
//                 ].map((item, idx) => (
//                   <li key={idx} className="flex items-start gap-3 md:gap-4">
//                     <span className="material-symbols-outlined text-primary p-1 bg-primary/10 rounded-lg">
//                       {item.icon}
//                     </span>
//                     <div>
//                       <h6 className="font-bold text-base md:text-lg">{item.title}</h6>
//                       <p className="text-on-surface-variant text-sm md:text-base">{item.desc}</p>
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//               <Link href="/register" className="inline-block bg-primary-gradient text-white px-8 md:px-10 py-4 md:py-5 rounded-xl font-bold text-base md:text-lg hover:scale-[1.05] transition-transform shadow-xl">
//                 Join as Partner
//               </Link>
//             </div>
//           </div>
//         </section>
//       </main>
//       <Footer />
//     </>
//   );
// }

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: popularServices } = await supabase.from('services').select('*').limit(6);

  // Derive unique categories from available services
  const uniqueCategories = popularServices ? Array.from(new Set(popularServices.map(s => s.category))) : [];

  // Icon mapper
  const catIconMap: Record<string, string> = {
    'cleaning': 'cleaning_services',
    'repair': 'build',
    'plumbing': 'plumbing',
    'electrical': 'bolt',
    'pest_control': 'pest_control',
    'hvac': 'ac_unit',
    'landscaping': 'grass'
  };

  // Shared Glassmorphism styles
  const glassBg = "glass-panel";

  // 3D Hover Effect for Cards
  const card3DHover = "transition-all duration-500 hover:-translate-y-2 hover:shadow-ambient-hover hover:border-secondary/50 will-change-transform";

  return (
    <>      <Header />

      {/* Atmospheric Background Orbs */}
      <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden">
        <div className="animate-orb-float-1 absolute top-[-5%] right-[-5%] w-[300px] md:w-[600px] h-[300px] md:h-[600px] rounded-full bg-[radial-gradient(circle,#c4b5fd_0%,transparent_70%)] blur-[60px] opacity-30 md:opacity-40"></div>
        <div className="animate-orb-float-2 absolute bottom-[10%] left-[-10%] w-[250px] md:w-[500px] h-[250px] md:h-[500px] rounded-full bg-[radial-gradient(circle,#93c5fd_0%,transparent_70%)] blur-[60px] opacity-30 md:opacity-40"></div>
      </div>

      <main className="relative z-10 px-4 sm:px-6 md:px-8 lg:px-12 max-w-7xl mx-auto flex flex-col gap-16 md:gap-24 pb-24 pt-6 md:pt-16 w-full overflow-hidden md:overflow-visible">

        {/* Section 1: Hero */}
        <section className="relative text-center md:text-left flex flex-col md:flex-row items-center gap-10 lg:gap-16 w-full pt-4 md:pt-0">

          {/* Floating 3D Elements (Hidden on very small screens to avoid clutter) */}
          <div className="hidden sm:flex absolute -left-4 top-10 animate-float-1 text-[4rem] z-20">🧽</div>
          <div className="hidden sm:flex absolute right-1/2 top-4 animate-float-2 text-[3rem] z-20">✨</div>
          <div className="hidden lg:flex absolute left-1/3 bottom-0 animate-float-1 text-[3.5rem] z-20">🔧</div>

          <div className="flex-1 w-full relative z-30">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-md border border-white/60 rounded-full mb-6 shadow-sm mx-auto md:mx-0">
              <span className="flex h-2.5 w-2.5 rounded-full bg-secondary shadow-secondary animate-pulse"></span>
              <span className="text-[11px] sm:text-xs md:text-sm font-bold text-primary">50k+ Verified Pros • Active Now</span>
            </div>

            <h1 className="text-[2.5rem] leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-primary mb-4 md:mb-6">
              Home Services,<br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-secondary to-teal-500 drop-shadow-sm">Reimagined.</span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-on-surface-variant mb-8 max-w-xl mx-auto md:mx-0 font-medium leading-relaxed px-2 md:px-0">
              Experience the sanctuary of a perfectly managed home. From clinical deep cleaning to expert repairs, we bring the best to your space.
            </p>

            {/* Interactive Search Bar */}
            <div className={`flex flex-col sm:flex-row items-center p-2 gap-2 rounded-[24px] sm:rounded-full w-full max-w-2xl mx-auto md:mx-0 ${glassBg} group`}>
              <div className="flex items-center w-full gap-3 px-4 py-2 sm:py-0">
                <span className="material-symbols-outlined text-outline group-focus-within:text-secondary transition-colors">search</span>
                <input
                  className="w-full bg-transparent border-none focus:ring-0 py-2 md:py-3 text-[15px] sm:text-base outline-none placeholder:text-[#94a3b8] text-primary font-semibold"
                  placeholder="What do you need help with?"
                  type="text"
                />
              </div>
              <button className="w-full sm:w-auto h-12 sm:h-12 px-8 bg-primary text-white rounded-[18px] sm:rounded-full font-bold hover:bg-secondary hover:text-primary hover:shadow-[0_0_20px_rgba(42,245,152,0.4)] active:scale-95 transition-all duration-300 flex items-center justify-center shrink-0">
                Find Pro
              </button>
            </div>
          </div>

          {/* Interactive 3D Promo Banner */}
          <div className="flex-1 w-full hidden md:block relative perspective-[1000px]">
            <div className="relative rounded-[36px] overflow-hidden h-[360px] shadow-[0_20px_50px_rgba(30,41,59,0.15)] w-full group cursor-pointer transform-3d hover:rotate-y-2 hover:-rotate-x-2 transition-transform duration-700 ease-out">

              {/* Moving Background Gradient */}
              <div className="absolute inset-0 bg-linear-to-br from-primary via-[#0f172a] to-[#0d3342] bg-size-[200%_200%] animate-[gradient_8s_ease_infinite]"></div>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(42,245,152,0.25)_0%,transparent_60%)]"></div>

              {/* Rotating 3D Rings */}
              <div className="absolute w-[350px] h-[350px] rounded-full border border-secondary/20 -right-20 -top-20 animate-spin-slow"></div>
              <div className="absolute w-[250px] h-[250px] rounded-full border-2 border-dashed border-secondary/10 right-0 -top-5 animate-[spin-slow_15s_linear_infinite_reverse]"></div>

              {/* Floating Element inside Card */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-90 animate-float-1 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]">🏠</div>

              <div className="relative z-10 p-10 h-full flex flex-col justify-center items-start transform translate-z-[30px]">
                <div className="inline-flex items-center gap-2 bg-secondary/20 backdrop-blur-sm border border-secondary/40 rounded-full px-3 py-1.5 text-xs font-bold text-secondary uppercase tracking-wider mb-5 shadow-[0_0_15px_rgba(42,245,152,0.2)]">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></div>
                  Limited Offer
                </div>
                <h3 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight mb-3 drop-shadow-md">First Clean<br />Free on Us</h3>
                <p className="text-white/70 text-sm font-medium mb-8 max-w-[200px]">New users get one deep clean at absolutely no charge.</p>
                <button className="bg-linear-to-r from-secondary to-[#08e07a] text-primary px-6 py-3 rounded-full text-sm font-extrabold hover:scale-105 shadow-[0_10px_20px_rgba(42,245,152,0.3)] active:scale-95 transition-all">
                  Claim Now →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Browse Services (Categories) */}
        {uniqueCategories.length > 0 && (
          <section className="w-full">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">Browse Services</h2>
              <Link href="/services" className="text-xs sm:text-sm font-bold text-secondary hover:underline flex items-center gap-1">
                See all <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
            {/* Snap Scrolling for Mobile */}
            <div className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              {uniqueCategories.map((cat, idx) => (
                <Link
                  key={idx}
                  href={`/search?q=${cat}`}
                  className={`snap-start shrink-0 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full group ${glassBg} hover:-translate-y-1 hover:border-secondary/40 hover:shadow-[0_8px_20px_rgba(42,245,152,0.15)] transition-all`}
                >
                  <span className="material-symbols-outlined text-primary group-hover:text-secondary group-hover:scale-110 transition-all text-sm sm:text-base">{catIconMap[cat] || 'home_repair_service'}</span>
                  <span className="text-[13px] sm:text-sm font-bold text-primary capitalize whitespace-nowrap">{cat.replace('_', ' ')}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Popular Services (3D Cards) */}
        {popularServices && popularServices.length > 0 && (
          <section className="w-full">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary mb-4 md:mb-6">Popular Near You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {popularServices.map((service, idx) => (
                <Link
                  key={service.id}
                  href={`/services/${service.category}/${service.id}`}
                  className={`relative p-5 sm:p-6 rounded-[24px] sm:rounded-[28px] overflow-hidden block ${glassBg} ${card3DHover} ${idx === 0 ? 'sm:col-span-2 lg:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6' : 'flex flex-col'}`}
                >
                  {/* Subtle 3D Light Reflection */}
                  <div className="absolute inset-0 bg-linear-to-br from-white/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="absolute top-4 right-4 bg-secondary/15 border border-secondary/30 rounded-full px-2.5 py-1 text-[10px] font-bold text-success uppercase tracking-wider z-10 shadow-sm">
                    {idx === 0 ? '⭐ Top Pick' : 'Popular'}
                  </div>

                  <div className={`rounded-[20px] bg-linear-to-br from-secondary/20 to-secondary/5 border border-secondary/20 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 z-10 relative ${idx === 0 ? 'w-16 h-16 sm:w-20 sm:h-20 text-3xl sm:text-4xl' : 'w-14 h-14 mb-4 text-2xl'}`}>
                    <span className="material-symbols-outlined text-success drop-shadow-sm">{catIconMap[service.category] || 'build'}</span>
                  </div>

                  <div className={`relative z-10 flex flex-col flex-1 w-full ${idx === 0 ? '' : 'mt-auto'}`}>
                    <h4 className={`font-bold text-primary mb-1 leading-tight ${idx === 0 ? 'text-lg sm:text-xl md:text-2xl' : 'text-[17px] sm:text-lg'}`}>
                      {service.title}
                    </h4>
                    <p className="text-[13px] text-on-surface-variant font-medium mb-4">
                      {service.duration_minutes} mins · Professional Service
                    </p>
                    <div className="flex items-center justify-between w-full mt-auto">
                      <div className="flex items-baseline gap-1">
                        <span className="text-[11px] text-on-surface-variant font-semibold uppercase">at just</span>
                        <span className="text-lg sm:text-xl font-extrabold text-primary">₹{service.base_price}</span>
                      </div>
                      <button className="bg-primary text-white rounded-full px-4 sm:px-5 py-2 sm:py-2.5 text-xs font-bold hover:bg-secondary hover:text-primary active:scale-95 shadow-md transition-all duration-200 flex items-center gap-1">
                        Book <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 4: How It Works (Interactive Steps) */}
        <section className="w-full">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary mb-4 md:mb-6">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {[
              { num: "1", title: "Pick a Service", desc: "Browse and choose what you need." },
              { num: "2", title: "Choose a Slot", desc: "Schedule at your convenience." },
              { num: "3", title: "We Show Up", desc: "Vetted pros arrive on time." },
            ].map((step, idx) => (
              <div key={idx} className={`flex items-center gap-4 p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] group ${glassBg} hover:bg-white/90 hover:scale-[1.02] transition-all cursor-default`}>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0 bg-linear-to-br from-secondary to-[#08e07a] flex items-center justify-center text-base sm:text-lg font-extrabold text-primary shadow-[0_4px_10px_rgba(42,245,152,0.4)] group-hover:rotate-12 transition-transform">
                  {step.num}
                </div>
                <div>
                  <h4 className="text-[15px] sm:text-base font-bold text-primary">{step.title}</h4>
                  <p className="text-[12px] sm:text-xs text-[#64748B] font-medium mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Trust Stats Strip (Responsive Flow) */}
        <section className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 sm:gap-6 p-5 sm:p-6 md:p-8 rounded-[20px] sm:rounded-[24px] w-full ${glassBg} shadow-inner`}>
          <div className="text-center flex-1 min-w-[100px]">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">50<span className="text-secondary">k+</span></div>
            <div className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant font-bold uppercase tracking-wide mt-1">Verified Pros</div>
          </div>
          <div className="w-px h-10 bg-primary/10 hidden sm:block"></div>
          <div className="text-center flex-1 min-w-[100px]">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">4.9<span className="text-secondary">★</span></div>
            <div className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant font-bold uppercase tracking-wide mt-1">Avg Rating</div>
          </div>
          <div className="w-px h-10 bg-primary/10 hidden sm:block"></div>
          <div className="text-center flex-1 min-w-full sm:min-w-[100px] mt-2 sm:mt-0">
            <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-primary">100<span className="text-secondary">%</span></div>
            <div className="text-[11px] sm:text-xs md:text-sm text-on-surface-variant font-bold uppercase tracking-wide mt-1">Pricing Clarity</div>
          </div>
        </section>

        {/* Section 7: Modern Glowing CTA */}
        <section className="relative rounded-[24px] sm:rounded-[36px] overflow-hidden p-8 sm:p-10 md:p-16 bg-primary text-center shadow-[0_20px_50px_rgba(30,41,59,0.3)] w-full perspective-1000">
          {/* Animated 3D Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(42,245,152,0.25)_0%,transparent_70%)] animate-pulse"></div>

          <div className="relative z-10 flex flex-col items-center transform-3d hover:translate-z-[10px] transition-transform duration-500">
            <div className="text-4xl sm:text-5xl mb-4 animate-float-1">✨</div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-white mb-3 leading-tight tracking-tight">
              Earn with us as a <br className="hidden sm:block" /><span className="text-secondary drop-shadow-[0_0_15px_rgba(42,245,152,0.4)]">Service Partner</span>
            </h2>
            <p className="text-[13px] sm:text-sm md:text-base text-white/70 mb-6 sm:mb-8 max-w-md font-medium px-4">
              Access a steady stream of high-quality bookings, flexible schedules, and professional training.
            </p>
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-secondary rounded-full px-6 sm:px-8 py-3 sm:py-4 text-[14px] sm:text-[15px] font-extrabold text-primary hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(42,245,152,0.5)] active:scale-95 transition-all w-full sm:w-auto">
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              Join as Partner Now
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}