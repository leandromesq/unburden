"use client";

import { useI18n } from "@/i18n/I18nProvider";

export function LegalFooter() {
	const { dictionary } = useI18n();
	const legal = dictionary.legalFooter;

	return (
		<section
			aria-labelledby="legal-title"
			className="mt-6 theme-panel rounded-xl p-5"
		>
			<h2 id="legal-title" className="text-lg font-semibold tracking-[-0.02em]">
				{legal.title}
			</h2>
			<p className="theme-text-dim mt-2 text-sm leading-6">{legal.copyright}</p>
			<div className="theme-text-dim mt-4 space-y-3 text-sm leading-6">
				<p>{legal.license}</p>
				<p>{legal.thirdParty}</p>
			</div>
		</section>
	);
}
