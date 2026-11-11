export function Comment({ body }: { body: string }) {
  return <p dangerouslySetInnerHTML={{ __html: body }} />;
}
