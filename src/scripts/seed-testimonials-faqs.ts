/**
 * Seed site-wide testimonials and FAQs for public pages + admin CMS.
 * Usage: npm run seed:testimonials-faqs
 */
import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '@core/database/connection';
import { logger } from '@core/logger';
import { Faq } from '@modules/faqs/model/faq.model';
import { Testimonial } from '@modules/testimonials/model/testimonial.model';

const TESTIMONIALS = [
  {
    name: 'Tarun Kumar',
    role: 'Google Review',
    company: 'Verified client',
    content:
      "An excellent choice for website design! I'm very happy with the services, and the team is extremely helpful. I highly recommend them to others.",
    rating: 5,
    sortOrder: 0,
    featured: true,
  },
  {
    name: 'Shruti Rai',
    role: 'Google Review',
    company: 'Verified client',
    content:
      'One of the best choices for website designing. I am very happy with the services and the team is also very helpful. I would love to recommend to others.',
    rating: 5,
    sortOrder: 1,
    featured: true,
  },
  {
    name: 'Aman Malik',
    role: 'Google Review',
    company: 'Verified client',
    content:
      'Good service and great work — very helpful to save time. Professional team and smooth delivery.',
    rating: 5,
    sortOrder: 2,
    featured: true,
  },
];

const FAQS = [
  {
    question: 'What does Growth Technos do?',
    answer:
      'Growth Technos is a full-service digital agency in Noida Sector 62. We provide web development, SEO, digital marketing, e-commerce development, SaaS development, UI/UX design, branding, and healthcare marketing for businesses in India and internationally.',
    category: 'General',
    sortOrder: 0,
    featured: true,
  },
  {
    question: 'Where is Growth Technos located?',
    answer:
      'Growth Technos is based in Noida Sector 62, Uttar Pradesh, India, and serves clients across Delhi NCR, India, and 12+ countries through on-site and remote collaboration.',
    category: 'General',
    sortOrder: 1,
    featured: true,
  },
  {
    question: 'Does Growth Technos work with healthcare clients?',
    answer:
      'Yes. Growth Technos delivers healthcare marketing and digital systems for clinics, hospitals, and healthcare brands — including patient-focused websites, local SEO, and compliant acquisition campaigns.',
    category: 'General',
    sortOrder: 2,
    featured: true,
  },
  {
    question: 'What is included in a free growth audit?',
    answer:
      'A practical review of your website, SEO foundations, and conversion paths — prioritized so you know what to fix first. We share clear next steps, usually within one business day.',
    category: 'Process',
    sortOrder: 3,
    featured: true,
  },
  {
    question: 'How do I get started?',
    answer:
      'Request a free growth audit or book a strategy call. We respond within one business day, review your goals, and share a clear plan covering website, SEO, and demand channels with recommended next steps.',
    category: 'Process',
    sortOrder: 4,
    featured: true,
  },
  {
    question: 'What services does Growth Technos offer?',
    answer:
      'We offer web development, e-commerce stores, mobile apps, UI/UX design, SEO services, digital marketing, social media management, cloud solutions, IT support, and specialized offerings across eight core categories. Explore our full catalog on the Services page.',
    category: 'General',
    sortOrder: 10,
    featured: false,
  },
  {
    question: 'Do you work with startups or only established businesses?',
    answer:
      'Both. We partner with funded startups ready to launch or scale, growing SMBs, and established enterprises that need a digital refresh, SEO growth, or a new product built from scratch.',
    category: 'General',
    sortOrder: 11,
    featured: false,
  },
  {
    question: 'How long does a typical web development project take?',
    answer:
      'Timelines depend on scope. A marketing website often takes 4–8 weeks. E-commerce and custom web apps typically run 6–12 weeks or more. After discovery we provide a phased roadmap with realistic milestones.',
    category: 'Process',
    sortOrder: 12,
    featured: false,
  },
  {
    question: 'What happens after I contact you?',
    answer:
      'We respond within one business day, schedule a 30-minute discovery call, then send a proposal with scope, phases, and delivery dates within 3–5 business days. Once approved, we kick off with a structured sprint plan.',
    category: 'Process',
    sortOrder: 13,
    featured: false,
  },
  {
    question: 'Can I hire you for ongoing support or retainers?',
    answer:
      'Yes. We offer monthly retainers for SEO, digital marketing, social media, IT support, and dedicated development resources. Retainer plans include defined hours, priority support, and regular reporting.',
    category: 'Process',
    sortOrder: 14,
    featured: false,
  },
  {
    question: 'Do you build websites on WordPress, Shopify, or custom code?',
    answer:
      'We work across WordPress, WooCommerce, Shopify, and custom stacks (Next.js, React, Node, and more). We recommend the platform that fits your timeline, technical needs, and long-term goals—not a one-size-fits-all approach.',
    category: 'Services',
    sortOrder: 15,
    featured: false,
  },
  {
    question: 'Can you redesign my existing website without losing SEO rankings?',
    answer:
      'Yes. We plan migrations carefully with URL mapping, redirects, metadata preservation, and post-launch monitoring. Our SEO team coordinates with development so rankings are protected during redesigns.',
    category: 'Services',
    sortOrder: 16,
    featured: false,
  },
  {
    question: 'How long does SEO take to show results?',
    answer:
      'SEO is a long-term effort. You may see early improvements in 8–12 weeks; competitive keywords often take 4–6 months or longer. We set realistic expectations and report on rankings, traffic, and conversions monthly.',
    category: 'SEO & Marketing',
    sortOrder: 17,
    featured: false,
  },
  {
    question: 'Do you provide local SEO for businesses in Noida and Delhi NCR?',
    answer:
      'Yes. We optimize Google Business Profile, local citations, location pages, and review strategies to help Noida, Delhi, and NCR businesses rank for local searches and map pack visibility.',
    category: 'SEO & Marketing',
    sortOrder: 18,
    featured: false,
  },
  {
    question: 'Will I own the website and source code?',
    answer:
      'Yes. After project handover you receive ownership of deliverables, source code, design files, and credentials as defined in your agreement. We document handover so your team can maintain or extend the project.',
    category: 'Technical',
    sortOrder: 19,
    featured: false,
  },
  {
    question: 'Do you provide hosting, SSL, and domain setup?',
    answer:
      'We can deploy to your preferred host or recommend reliable providers. We configure SSL, staging environments, backups, and performance optimization. You may keep hosting in your own account for full control.',
    category: 'Technical',
    sortOrder: 20,
    featured: false,
  },
  {
    question: 'Can you sign an NDA before we share project details?',
    answer:
      'Absolutely. Mention it when you reach out and we will send a mutual NDA before the discovery call. We treat client information and trade secrets with strict confidentiality.',
    category: 'General',
    sortOrder: 21,
    featured: false,
  },
];

async function seedTestimonials() {
  let created = 0;
  for (const item of TESTIMONIALS) {
    const existing = await Testimonial.findOne({ name: item.name, content: item.content }).exec();
    if (existing) continue;
    await Testimonial.create({ ...item, isActive: true });
    created += 1;
  }
  return created;
}

async function seedFaqs() {
  let created = 0;
  for (const item of FAQS) {
    const existing = await Faq.findOne({ question: item.question }).exec();
    if (existing) {
      if (item.featured && !existing.featured) {
        existing.featured = true;
        await existing.save();
      }
      continue;
    }
    await Faq.create({ ...item, isActive: true });
    created += 1;
  }
  return created;
}

async function main() {
  await connectDatabase();
  const testimonials = await seedTestimonials();
  const faqs = await seedFaqs();
  logger.info(`Seeded testimonials (+${testimonials}) and FAQs (+${faqs})`);
  await disconnectDatabase();
}

main().catch(async (error) => {
  logger.error('Failed to seed testimonials/FAQs', { error });
  await disconnectDatabase().catch(() => undefined);
  process.exit(1);
});
