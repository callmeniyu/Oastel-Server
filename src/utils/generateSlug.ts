export const generateSlug = (title: string): string => {
    return title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "") // Remove special characters
        .replace(/\s+/g, "-") // Replace spaces with hyphens
        .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
        .trim() // Remove leading/trailing whitespace
        .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
}
