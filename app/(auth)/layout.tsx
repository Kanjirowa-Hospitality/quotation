export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-background px-3 py-4 sm:px-5 lg:px-7">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-7xl overflow-hidden rounded-lg bg-white shadow-[0_24px_80px_rgba(17,17,17,0.18)] lg:grid-cols-[1fr_minmax(440px,560px)]">
        <section className="relative hidden overflow-hidden bg-[#211d1a] px-10 py-10 text-white lg:block">
          <p className="relative z-10 text-sm text-white/62">Quotation management for Kanjirowa Hotelware.</p>

          <div className="absolute left-10 top-40 z-10 max-w-[390px]">
            <h2 className="text-5xl font-semibold leading-[0.98] text-white">
              Build quotations with your catalog.
            </h2>
          </div>

          <div className="absolute left-10 top-[310px] z-10 max-w-[350px]">
            <p className="text-base leading-7 text-white/66">
              Manage items, categories, pricing, and secure admin workflows from one focused dashboard.
            </p>
          </div>

          <div className="absolute bottom-12 right-10 z-10 w-[310px] rotate-[-6deg] rounded-[2rem] border border-white/12 bg-black/35 p-3 shadow-2xl xl:w-[340px]">
            <div className="rounded-[1.45rem] bg-[#f7f7f3] p-4 text-[#1d1a17]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-black/45">Current quote</p>
                  <p className="text-lg font-semibold">Hospitality Set</p>
                </div>
                <div className="rounded-full bg-[#211d1a] px-3 py-1 text-xs font-medium text-white">Draft</div>
              </div>

              <div className="space-y-2">
                {["Room linen", "Restaurant items", "Guest amenities"].map((item, index) => (
                  <div key={item} className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm">
                    <div>
                      <p className="text-sm font-medium">{item}</p>
                      <p className="text-xs text-black/45">{index + 2} variants selected</p>
                    </div>
                    <p className="text-sm font-semibold">{index === 0 ? "24" : index === 1 ? "18" : "12"}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md bg-[#211d1a] p-4 text-white">
                <p className="text-xs text-white/55">Ready for export</p>
                <p className="mt-1 text-2xl font-semibold">Quotation PDF</p>
              </div>
            </div>
          </div>

          <div className="absolute left-20 top-44 size-64 rounded-full border border-white/7" />
          <div className="absolute left-32 top-56 size-40 rounded-full border border-white/7" />
        </section>

        <section className="flex min-h-[calc(100dvh-2rem)] items-start justify-center bg-white px-5 py-10 sm:px-8 lg:min-h-full lg:px-12 lg:py-4">
          <div className="w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  );
}
