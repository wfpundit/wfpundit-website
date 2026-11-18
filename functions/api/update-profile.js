
import { currentUser, json, readJson, validOrigin } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  if (!validOrigin(request)) {
    return json({
      success: false,
      error: "Request could not be verified."
    }, 403);
  }

  let data;

  try {
    data = await readJson(request);
  } catch {
    return json({
      success: false,
      error: "Please submit the form again."
    }, 400);
  }

  const displayName = typeof data.displayName === "string"
    ? data.displayName.trim()
    : "";

  if (displayName.length < 2 || displayName.length > 50) {
    return json({
      success: false,
      error: "Enter a name between 2 and 50 characters."
    }, 400);
  }

  try {
    const user = await currentUser(request, env);

    if (!user) {
      return json({
        success: false,
        error: "Please log in again to update your profile."
      }, 401);
    }

    await env.DB.prepare(
      "UPDATE reader_accounts SET display_name = ? WHERE id = ?"
    ).bind(displayName, user.id).run();

    return json({
      success: true,
      message: "Your profile name has been updated.",
      user: {
        id: user.id,
        email: user.email,
        displayName
      }
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return json({
      success: false,
      error: "We couldn't update your profile. Please try again."
    }, 500);
  }
}
