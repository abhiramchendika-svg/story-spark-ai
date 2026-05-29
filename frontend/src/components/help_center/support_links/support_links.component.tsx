import { FC } from "react";
import { motion } from "framer-motion";
import { SupportLink } from "../help_center.utils";

interface SupportLinksProps {
  links: SupportLink[];
}

const SupportLinks: FC<SupportLinksProps> = ({ links }) => {
  return (
    <motion.section
      id="support-links-section"
      className="scroll-mt-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5 }}
      aria-labelledby="support-heading"
    >
      {/* Header */}
      <div className="mb-12 text-center md:text-left">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-300">
          <i className="fa-solid fa-headset"></i>
          COMMUNITY & SUPPORT
        </div>

        <h2
          id="support-heading"
          className="mt-5 text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white"
        >
          Need More Help?
        </h2>

        <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400 leading-relaxed mx-auto md:mx-0">
          Connect with the StorySparkAI community, report issues, explore
          documentation, and collaborate with contributors worldwide.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {links && links.map((link, index) => (
          <motion.a
            key={link.id}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.45,
              delay: index * 0.08,
            }}
            className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/10 dark:border-white/10 dark:bg-slate-900/70 dark:hover:border-indigo-500/30"
          >
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex items-start gap-5">
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-600 shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:bg-indigo-500/20 dark:text-indigo-300">
                <i className={`${link.icon} text-2xl`} aria-hidden="true"></i>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
                    {link.title}
                  </h3>
                  {link.external && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-all duration-300 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 dark:bg-white/5 dark:text-slate-400">
                      <i className="fa-solid fa-arrow-up-right-from-square text-[10px]" aria-hidden="true"></i>
                    </span>
                  )}
                </div>

                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {link.description}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition-all duration-300 group-hover:gap-3 dark:text-indigo-300">
                  Explore Resource
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-6 h-1 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 opacity-70 transition-all duration-300 group-hover:w-32" />
          </motion.a>
        ))}
      </div>

      {/* Bottom Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        viewport={{ once: true }}
        className="mt-12 overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-blue-50 p-6 shadow-sm dark:border-indigo-500/20 dark:from-indigo-950/40 dark:via-slate-900 dark:to-blue-950/30"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 flex-shrink-0">
              <i className="fa-solid fa-users"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Open Source Community
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                StorySparkAI is powered by contributors worldwide. Join the
                community, submit improvements, and help shape the future of
                AI storytelling.
              </p>
            </div>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-3 text-sm font-semibold text-indigo-600 transition-all duration-300 hover:scale-105 hover:bg-indigo-500/20 dark:text-indigo-300 whitespace-nowrap justify-center self-stretch md:self-auto"
          >
            <i className="fa-brands fa-github text-base"></i>
            Contribute Now
          </a>
        </div>
      </motion.div>
    </motion.section>
  );
};

export default SupportLinks;