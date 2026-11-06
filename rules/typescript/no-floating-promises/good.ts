declare function persist(draft: Draft): Promise<void>;

export async function saveDraft(draft: Draft): Promise<void> {
  await persist(draft);
  showToast('Saved');
}
