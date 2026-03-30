import { useState, useEffect } from "react";
import { pb } from "../lib/pocketbase";
import { Button } from "./catalyst/button";
import { Field, Label } from "./catalyst/fieldset";
import { Input } from "./catalyst/input";
import { Textarea } from "./catalyst/textarea";
import { Select } from "./catalyst/select";

interface BookFormProps {
  bookId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface BookFormData {
  title: string;
  author: string;
  description: string;
  status: "reading" | "completed";
  purchase_link: string;
  start_date: string;
  end_date: string;
  sort_order: number;
}

export default function BookForm({
  bookId,
  onSuccess,
  onCancel,
}: BookFormProps) {
  const [formData, setFormData] = useState<BookFormData>({
    title: "",
    author: "",
    description: "",
    status: "reading",
    purchase_link: "",
    start_date: "",
    end_date: "",
    sort_order: 0,
  });
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [existingCoverUrl, setExistingCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBook, setIsLoadingBook] = useState(!!bookId);

  useEffect(() => {
    if (bookId) {
      loadBook();
    }
  }, [bookId]);

  async function loadBook() {
    try {
      const book = await pb.collection("books").getOne(bookId!);
      setFormData({
        title: book.title || "",
        author: book.author || "",
        description: book.description || "",
        status: book.status || "reading",
        purchase_link: book.purchase_link || "",
        start_date: book.start_date || "",
        end_date: book.end_date || "",
        sort_order: book.sort_order || 0,
      });
      if (book.cover_image) {
        setExistingCoverUrl(pb.files.getURL(book, book.cover_image));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load book");
    } finally {
      setIsLoadingBook(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const data = new FormData();
      data.append("title", formData.title);
      data.append("author", formData.author);
      data.append("description", formData.description);
      data.append("status", formData.status);
      data.append("purchase_link", formData.purchase_link);
      data.append("start_date", formData.start_date);
      data.append("end_date", formData.end_date);
      data.append("sort_order", String(formData.sort_order));

      if (coverImageFile) {
        data.append("cover_image", coverImageFile);
      }

      if (bookId) {
        await pb.collection("books").update(bookId, data);
      } else {
        await pb.collection("books").create(data);
      }

      if (onSuccess) {
        onSuccess();
      } else {
        window.location.href = "/app/books";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save book");
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(field: keyof BookFormData, value: string | number) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCoverImageFile(file);
  }

  if (isLoadingBook) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          Loading book...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <Field>
        <Label>Title *</Label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </Field>

      <Field>
        <Label>Author *</Label>
        <Input
          type="text"
          value={formData.author}
          onChange={(e) => handleChange("author", e.target.value)}
          required
        />
      </Field>

      <Field>
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
        />
      </Field>

      <Field>
        <Label>Status *</Label>
        <Select
          value={formData.status}
          onChange={(e) => handleChange("status", e.target.value)}
        >
          <option value="reading">Currently Reading</option>
          <option value="completed">Completed</option>
        </Select>
      </Field>

      <Field>
        <Label>Cover Image</Label>
        {existingCoverUrl && !coverImageFile && (
          <div className="mb-2">
            <img
              src={existingCoverUrl}
              alt="Current cover"
              className="h-24 w-16 rounded object-cover shadow-sm"
            />
          </div>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-zinc-400 dark:file:bg-indigo-900/20 dark:file:text-indigo-400"
        />
      </Field>

      <Field>
        <Label>Purchase Link</Label>
        <Input
          type="url"
          value={formData.purchase_link}
          onChange={(e) => handleChange("purchase_link", e.target.value)}
          placeholder="https://..."
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field>
          <Label>Start Date</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange("start_date", e.target.value)}
          />
        </Field>

        <Field>
          <Label>End Date</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange("end_date", e.target.value)}
          />
        </Field>
      </div>

      <Field>
        <Label>Sort Order</Label>
        <Input
          type="number"
          value={formData.sort_order}
          onChange={(e) =>
            handleChange("sort_order", parseInt(e.target.value) || 0)
          }
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Controls display order of completed books (lower numbers appear first)
        </p>
      </Field>

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" plain onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : bookId ? "Update Book" : "Create Book"}
        </Button>
      </div>
    </form>
  );
}
