export default function Loading() {
  return (
    <main className="loading-screen" aria-busy="true" aria-label="Loading Family Shelf">
      <div className="loading-screen__image" />
      <div className="loading-screen__status">
        <span className="loading-screen__dot" />
        Loading catalog
      </div>
    </main>
  );
}
