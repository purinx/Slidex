export const handler = async () => ({
  statusCode: 503,
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    error: {
      code: "BACKEND_NOT_DEPLOYED",
      message: "Deploy the backend Lambda package to enable SlideX."
    }
  })
});
