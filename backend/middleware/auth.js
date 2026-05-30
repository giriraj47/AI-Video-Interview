/**
 * Middleware to verify the admin secret key.
 * Checks the `x-admin-secret` header or `secret` query parameter.
 */
export const checkAdminSecret = (req, res, next) => {
  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res
      .status(401)
      .json({ error: "Unauthorized access: Invalid secret key" });
  }
  next();
};
