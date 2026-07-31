import Image from "next/image";

export const CRAFT_STAGES = [
  {
    src: "/craft/1.jpeg",
    numeral: "I",
    title: "The grid",
    caption:
      "Iconometry first. Every proportion is fixed before a single line of the deity is drawn.",
    alt: "Blank cotton canvas marked only with the iconometric measuring grid for a seated Buddha",
  },
  {
    src: "/craft/2.jpeg",
    numeral: "II",
    title: "The figure",
    caption:
      "The Buddha is constructed inside the grid, unit by prescribed unit.",
    alt: "The seated Buddha figure drawn over the measuring grid, following prescribed proportions",
  },
  {
    src: "/craft/3.jpeg",
    numeral: "III",
    title: "The line",
    caption:
      "Grid erased. Clouds, hills, and the lotus throne appear in fine outline.",
    alt: "Complete line drawing of the Buddha with landscape, clouds, and lotus throne, grid removed",
  },
  {
    src: "/craft/4.jpeg",
    numeral: "IV",
    title: "The ground",
    caption: "First washes — sky, hills, and the green aureole behind the head.",
    alt: "First colour washes laid into the landscape and halo while the figure remains uncoloured",
  },
  {
    src: "/craft/5.jpeg",
    numeral: "V",
    title: "The blocking",
    caption:
      "Flat mineral colour for robe, body, and throne. No shading, no face.",
    alt: "The Buddha blocked in with flat mineral colour, face still unpainted",
  },
  {
    src: "/craft/6.jpeg",
    numeral: "VI",
    title: "The shading",
    caption:
      "Tonal gradation gives the robes weight — and the face is painted.",
    alt: "Shading added to the robes and landscape, with the Buddha's face now painted",
  },
  {
    src: "/craft/7.jpeg",
    numeral: "VII",
    title: "The outline",
    caption: "Fine black and gold linework sharpens every edge and petal.",
    alt: "Fine outlining in black and gold defining the figure, lotus petals, and rocks",
  },
  {
    src: "/craft/8.jpeg",
    numeral: "VIII",
    title: "The finish",
    caption:
      "Last details, then the eye-opening — the moment it stops being a picture.",
    alt: "The finished thangka with full detail, gold work, and completed landscape",
  },
] as const;

const THANKA_PASSAGES = [
  {
    title: "What is a thangka?",
    body: "A thangka (also spelled tangka or thanka) is a Tibetan Buddhist painting, usually on cotton or silk, that depicts a deity, mandala, or scene from Buddhist teaching. Unlike a mural, a thangka is portable: it is mounted in a textile frame, often rolled up, and can be carried between monasteries or on pilgrimage. That portability made thangkas essential tools for teaching and ritual across a vast and mountainous region where texts and images needed to travel.",
  },
  {
    title: "Materials and surface",
    body: "Traditional thangka painters do not use ready-made canvas. The process begins with cotton cloth stretched taut over a wooden frame (Tibetan: rkyang shing), coated with a layer of white paint to form the ground. The most common stretcher size for a single thangka is roughly two by three feet, though historically silk, linen, and even leather were used as supports. The paint itself is distempered: powdered mineral and plant pigments bound with a dilute hide-glue size, producing a fast-drying, water-soluble paint that dries to a matte finish.",
  },
  {
    title: "Iconometry",
    body: "A thangka painter must know the exact proportions prescribed for each deity. These guiding principles, maintained through artistic tradition, use units that carry no fixed size but remain proportional to one another — twelve small units making up every large unit. A Buddha, a wrathful protector, and a bodhisattva each have their own canon of proportion, drawn from scripture and passed down master to student. Nothing is left to individual license: the geometry itself is considered sacred, because an incorrectly proportioned deity is thought to be spiritually ineffective — or even harmful.",
  },
  {
    title: "Colour",
    body: "Every colour carries meaning. White is associated with purity and knowledge, red with power and life-force, blue with infinity and the sky, yellow with earth and renunciation, black with the destruction of ignorance, and green with balance and activity. Traditional pigments came from ground minerals — malachite for green, azurite or lapis lazuli for blue, cinnabar for red, orpiment for yellow — along with gold, applied as fine powder or leaf for halos, jewellery, and rays of light.",
  },
  {
    title: "Opening the eyes",
    body: "The painting of the deity's eyes is reserved for last, and is treated as the most consequential moment in the entire process. Only once the eyes are complete does the painting become a true representation of the deity. Consecration follows: mantra syllables corresponding to the deity's head, throat, and heart are inscribed on the reverse of the canvas, after which the deity is believed to inhabit the image. Without this ritual, a thangka — however technically accomplished — remains an unconsecrated picture rather than a living sacred object.",
  },
  {
    title: "Mounting",
    body: "Once painting is complete, the canvas is trimmed and mounted into a brocade frame with proportional rules of its own: the bottom section is half the height of the painted area and widens slightly toward the bottom, the top section is half the height of the bottom, the side pieces are half as wide as the top section is tall, and the inner border is usually a quarter the width of the sides. The edges are hemmed with cord and wooden rods inserted at top and bottom — the bottom rod capped — so the finished thangka can be rolled and unrolled like a scroll.",
  },
];

const PAUBHA_PASSAGES = [
  {
    title: "What is a paubha?",
    body: "Paubha is the sacred scroll-painting tradition of the Newar people of Nepal's Kathmandu Valley — practised by artists of the Chitrakar caste, whose very name means “painter” and whose craft has traditionally passed from father to son within the family lineage. Newar paintings are known as paubha in Newari and pata in Sanskrit, usually rectangular, prepared from cotton woven specifically to the dimensions each painting requires. Where thangka is exclusively a Buddhist form, paubha weaves together both Hindu and Buddhist imagery — a reflection of the Valley's long history of religious coexistence.",
  },
  {
    title: "Origins and history",
    body: "“Paubha” derives from the Sanskrit “Patrabhattarak,” meaning the depiction of deities on a flat surface. References appear as far back as the tantric text Manjushree Mulakalpa, associated with the 3rd century A.D., and oral history extends the practice back beyond the 7th century. The form reached particular refinement during the Malla era (roughly the 12th to 18th centuries), when the Valley's kings were significant patrons and paubha painting achieved new levels of delicacy and depth.",
  },
  {
    title: "A two-way exchange",
    body: "Newar artists were prized far beyond the Valley: Tibetan paintings from the ninth through seventeenth centuries were, stylistically, overwhelmingly Nepali in character. Some accounts describe paubha as a direct precursor to the thangka, carried over Himalayan passes by merchant-monks; others describe it as developing under later Tibetan influence. The honest answer is that the two traditions grew up side by side in close, ongoing exchange, making a clean one-directional story hard to sustain.",
  },
  {
    title: "Preparing the canvas",
    body: "As with thangka, everything begins with the surface. The artisan stretches a piece of cloth and applies a mixture of buffalo glue and white clay to create the ground. Some accounts describe the base layer slightly differently — cotton or linen coated with chalk and animal glue — but the principle is consistent: an animal-glue binder combined with a fine white mineral filler, burnished until smooth enough to take fine detail.",
  },
  {
    title: "Ritual before craft",
    body: "Paubha painting is inseparable from ritual observance. Historical descriptions detail purificatory rites for preparing materials, an empowerment ceremony for the artist known as hastapuja, and periods of mental and spiritual preparation before the artist is considered ready to complete the painted image — culminating in consecration rituals that animate and vivify the finished work. The creative process begins with prayers and blessings, after which the artist outlines the composition according to iconometric measurements drawn from ancient scripture.",
  },
  {
    title: "Pigments and colour",
    body: "Paubha pigments, like those of thangka, come from the earth and from plants. Colours are prepared exclusively from mineral and plant materials, requiring extensive manual grinding, with red, blue, yellow, black, and white among the core palette and a binder called saresh used to fix the pigment to the surface. Gold leaf or powdered gold frequently accentuates fine details and lends a divine luminosity, particularly in depictions of celestial realms and heavenly beings.",
  },
  {
    title: "Format and subject",
    body: "The vertical scroll format suited a practical purpose: it could be rolled up and carried over high Himalayan passes to clients in Tibet, then installed as a focal point for meditation or worship inside a monastery or temple. Subject matter centres on important deities, mandalas of divine assemblies, and monuments surrounded by attendant figures. Unlike Tibetan thangka, which range from modest scale up to enormous ceremonial display pieces, Newar paubha tend to keep to a more uniform, moderate size.",
  },
  {
    title: "Decline and revival",
    body: "Political upheaval at the end of the Malla era, combined with the physical fragility of cloth as a medium, contributed to the decline of the traditional practice, and today only a small number of traditional painters remain, with many of the accompanying rituals largely lost. In recent decades, however, a modest but meaningful revival has taken hold, with Chitrakar families and dedicated teachers — workshops around Patan and Bhaktapur are especially known for this — working to keep the art, and the ritual knowledge behind it, alive for a new generation.",
  },
];

const FIRST_STAGE = CRAFT_STAGES[0];
const LAST_STAGE = CRAFT_STAGES[CRAFT_STAGES.length - 1];

export default function CraftGuide() {
  return (
    <div className="container-page py-16 md:py-24">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <p className="flex items-center gap-3 text-[10.5px] uppercase tracking-[0.28em] text-ink-mute">
            <span className="text-saffron">No. 03</span>
            <span aria-hidden="true" className="h-px w-8 bg-(--line)" />
            <span>The Making</span>
          </p>
          <h2 className="mt-5 max-w-[16ch] font-serif text-[clamp(32px,4.4vw,54px)] leading-[1.03] font-medium tracking-[-0.015em] text-ink">
            One thanka, in{" "}
            <em className="font-normal text-ink-soft">eight stages</em>
          </h2>
        </div>
        <p className="max-w-[42ch] text-[15.5px] leading-[1.7] text-ink-soft">
          Nothing here is improvised. The proportions come from scripture, the
          pigments from ground stone, and the eyes are painted last — the moment
          the painting stops being a picture.
        </p>
      </div>

      {/* Before / after */}
      <div className="mt-12 grid items-center gap-6 md:grid-cols-[1fr_auto_1fr] md:gap-10">
        <BookendFrame stage={FIRST_STAGE} label="Day one" />
        <div
          aria-hidden="true"
          className="flex items-center justify-center gap-3 text-ink-mute max-md:py-1"
        >
          <span className="h-px w-10 bg-(--line) max-md:w-16" />
          <span className="font-serif text-[13px] uppercase tracking-[0.24em]">
            4 months
          </span>
          <span className="h-px w-10 bg-(--line) max-md:w-16" />
        </div>
        <BookendFrame stage={LAST_STAGE} label="Four months later" />
      </div>

      {/* Stage sequence */}
      <div className="mt-16 border-t border-(--line) pt-8">
        <p className="text-[10.5px] uppercase tracking-[0.24em] text-ink-mute">
          Every stage, in order
        </p>
        <ol className="mt-6 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-7">
          {CRAFT_STAGES.map((stage) => (
            <li key={stage.src}>
              <figure>
                <div className="group relative aspect-3/4 overflow-hidden bg-paper-2">
                  <Image
                    src={stage.src}
                    alt={stage.alt}
                    fill
                    sizes="(max-width: 768px) 45vw, 23vw"
                    className="object-cover"
                  />
                  <span className="absolute top-0 left-0 bg-paper/92 px-2.5 py-1.5 font-serif text-[13px] leading-none tracking-[0.1em] text-ink">
                    {stage.numeral}
                  </span>
                  <div
                    className="pointer-events-none absolute inset-2 border border-gold/25"
                    aria-hidden="true"
                  />
                </div>
                <figcaption className="mt-3 border-t border-(--line-soft) pt-2.5">
                  <p className="font-serif text-[19px] leading-tight text-ink">
                    {stage.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-[1.5] text-ink-mute">
                    {stage.caption}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>

      {/* Full account — collapsed by default so the page stays visual */}
      <details className="group mt-14 border-t-2 border-ink pt-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left [&::-webkit-details-marker]:hidden">
          <span>
            <span className="text-[10.5px] uppercase tracking-[0.28em] text-saffron">
              The full account
            </span>
            <span className="mt-2 block font-serif text-[clamp(24px,3vw,34px)] leading-tight font-medium text-ink">
              How thanka and paubha are created
            </span>
          </span>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-(--line) text-ink transition-colors group-hover:border-ink group-open:bg-ink group-open:text-paper">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
              className="transition-transform duration-200 group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </summary>

        <div className="mt-10">
          <p className="max-w-[70ch] text-[16.5px] leading-[1.75] text-ink-soft">
            High in the Himalayan world that stretches from the Kathmandu Valley
            to the Tibetan plateau, two closely related but distinct painting
            traditions have carried Buddhist and Hindu iconography across
            centuries. Both are scroll paintings created as objects of devotion
            rather than decoration — meditation aids, ritual tools, and vessels
            believed to actually house the presence of the deity they depict.
            Newar artists from the Kathmandu Valley were, historically,
            instrumental in shaping Tibetan painting itself, yet each tradition
            developed its own vocabulary of colour, proportion, ritual, and
            technique.
          </p>

          <PartHeading part="Part One" title="Tibetan thangka painting" />
          <div className="mt-8 space-y-8">
            {THANKA_PASSAGES.map((passage) => (
              <Passage key={passage.title} title={passage.title}>
                {passage.body}
              </Passage>
            ))}
          </div>

          <PartHeading part="Part Two" title="Newari paubha painting" />
          <div className="mt-8 space-y-8">
            {PAUBHA_PASSAGES.map((passage) => (
              <Passage key={passage.title} title={passage.title}>
                {passage.body}
              </Passage>
            ))}
          </div>

          <div className="mt-12 grid gap-8 border-t border-(--line) pt-8 md:grid-cols-12 md:gap-14">
            <p className="text-[10.5px] uppercase tracking-[0.24em] text-ink-mute md:col-span-3">
              In closing
            </p>
            <p className="text-[16.5px] leading-[1.75] text-ink-soft md:col-span-9">
              Both thangka and paubha painting demand something rare in any
              craft: total discipline in service of something the artist did not
              invent. The proportions are prescribed, the pigments are earned
              through hours of grinding stone, and the final brushstroke — the
              opening of the eyes — is treated not as the artist&rsquo;s
              flourish but as the moment the painting stops being a picture and
              starts being a presence.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}

function BookendFrame({
  stage,
  label,
}: {
  stage: (typeof CRAFT_STAGES)[number];
  label: string;
}) {
  return (
    <figure>
      <div className="relative aspect-3/4 overflow-hidden bg-paper-2 shadow-(--shadow-1)">
        <Image
          src={stage.src}
          alt={stage.alt}
          fill
          sizes="(max-width: 768px) 100vw, 42vw"
          className="object-cover"
        />
        <div
          className="pointer-events-none absolute inset-3 border border-gold/30"
          aria-hidden="true"
        />
      </div>
      <figcaption className="mt-3 flex items-baseline justify-between gap-4 border-t border-(--line-soft) pt-3">
        <span className="text-[10.5px] uppercase tracking-[0.24em] text-saffron">
          {label}
        </span>
        <span className="font-serif text-[17px] text-ink">{stage.title}</span>
      </figcaption>
    </figure>
  );
}

function PartHeading({ part, title }: { part: string; title: string }) {
  return (
    <div className="mt-14 flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-(--line) pt-6">
      <span className="text-[10.5px] uppercase tracking-[0.28em] text-saffron">
        {part}
      </span>
      <h3 className="font-serif text-[clamp(24px,3vw,34px)] leading-tight font-medium text-ink">
        {title}
      </h3>
    </div>
  );
}

function Passage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t border-(--line-soft) pt-6 md:grid-cols-12 md:gap-14">
      <h4 className="text-[11px] uppercase tracking-[0.22em] text-ink-mute md:col-span-3">
        {title}
      </h4>
      <div className="max-w-[70ch] text-[16px] leading-[1.75] text-ink-soft md:col-span-9">
        {children}
      </div>
    </section>
  );
}
