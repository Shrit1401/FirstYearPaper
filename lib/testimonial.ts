export type Testimonial = {
  quote?: string;
  author: string;
  badge?: string;
  image?: string;
  imageAlt?: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    quote: "i think you are single handedly responsible for my marks",
    author: "Nishita",
    badge: "repeat",
  },
  {
    quote:
      "Best ₹40 spent , the last min rev feature came in clutch many times !",
    author: "Piyush",
    badge: "repeat",
  },
  {
    quote:
      "ur website genuinely helped me a lot cause all the pyqs were in one single place, whereas the library website is just so mixed up. it did help me understand the pattern of questions so honestly thanks man it helped a lot",
    author: "Priyankshu",
    badge: "repeat",
  },
  {
    image: "/testimonials/ayush-whatsapp.png",
    imageAlt: "WhatsApp message from Ayush",
    author: "Ayush",
  },
  {
    quote:
      "This website genuinely simplified exam prep for me. Having all the previous year papers in one place is already really helpful, but the Repeat feature saves a lot of time by quickly highlighting frequently asked questions. It made studying much more efficient and convenient.",
    author: "Gara Sashank Yadav",
    badge: "repeat",
  },
  {
    quote:
      "my marks increased exponentially bcz it was so easy to just see all my subjects in one place with good ui. pretty good site",
    author: "Rishikanth",
    badge: "repeat",
  },
  {
    quote:
      "I've been using repeat for my first year exams, and it's genuinely helped a lot. The ease of finding past year papers and focusing on specific topics makes exam study less stressful. Since we all study one or two nights before the exam it's useful to boost marks. Excited to see future upgrades",
    author: "Pavan",
    badge: "repeat",
  },
  {
    quote:
      "ngl i hated how different websites looked. having these papers in one place is pretty nice, idk how to thank you it's pretty good",
    author: "Shreyas",
  },
  {
    quote:
      "repeat feature was really helpful, i was able to get questions in jiff and solve those questions, cool af",
    author: "Sammaira",
    badge: "repeat",
  },
];
