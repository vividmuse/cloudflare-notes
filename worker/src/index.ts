interface Env {
  DB: D1Database;
}

interface Note {
  id: string;
  content: string;
  tags: string[];
  created_at: number;
  updated_at: number;
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    // 获取所有笔记
    if (req.method === "GET" && pathname === "/api/notes") {
      const { results } = await env.DB.prepare(`
        SELECT 
          id,
          content,
          tags,
          created_at,
          updated_at
        FROM notes 
        ORDER BY created_at DESC
      `).all();
      
      return Response.json(results);
    }

    // 创建新笔记
    if (req.method === "POST" && pathname === "/api/notes") {
      const { content, tags } = await req.json();
      
      if (!content) {
        return new Response("Content is required", { status: 400 });
      }

      const now = Date.now();
      const { success, meta } = await env.DB.prepare(`
        INSERT INTO notes (content, tags, created_at, updated_at) 
        VALUES (?, ?, ?, ?)
      `).bind(content, JSON.stringify(tags || []), now, now).run();

      if (!success) {
        return new Response("Failed to create note", { status: 500 });
      }

      // 获取新创建的笔记
      const { results } = await env.DB.prepare(`
        SELECT * FROM notes WHERE id = ?
      `).bind(meta.last_row_id).all();

      return Response.json(results[0]);
    }

    // 更新笔记
    if (req.method === "PUT" && pathname.startsWith("/api/notes/")) {
      const id = pathname.split("/").pop();
      const { content, tags } = await req.json();
      
      if (!id || !content) {
        return new Response("Note ID and content are required", { status: 400 });
      }

      const now = Date.now();
      const { success } = await env.DB.prepare(`
        UPDATE notes 
        SET content = ?, tags = ?, updated_at = ?
        WHERE id = ?
      `).bind(content, JSON.stringify(tags || []), now, id).run();

      if (!success) {
        return new Response("Failed to update note", { status: 500 });
      }

      // 获取更新后的笔记
      const { results } = await env.DB.prepare(`
        SELECT * FROM notes WHERE id = ?
      `).bind(id).all();

      return Response.json(results[0]);
    }

    // 删除笔记
    if (req.method === "DELETE" && pathname.startsWith("/api/notes/")) {
      const id = pathname.split("/").pop();
      
      if (!id) {
        return new Response("Note ID is required", { status: 400 });
      }

      const { success } = await env.DB.prepare(`
        DELETE FROM notes WHERE id = ?
      `).bind(id).run();

      if (!success) {
        return new Response("Failed to delete note", { status: 500 });
      }

      return Response.json({ success: true });
    }

    return new Response("Not Found", { status: 404 });
  },
};
