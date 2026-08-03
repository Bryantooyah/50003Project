type StudentPageProps = {
  currentUser: { name?: string } | null;
};

export default function StudentPage({ currentUser }: StudentPageProps) {
  return (
    <div className="page-body">
      <section className="card empty-state">
        <h2>Welcome{currentUser?.name ? `, ${currentUser.name}` : ""}</h2>
        <p className="muted">
          The student view hasn&apos;t been built yet — this route exists so
          logging in as a student doesn&apos;t land on the wrong page. Check
          back once that use case is implemented.
        </p>
      </section>
    </div>
  );
}
