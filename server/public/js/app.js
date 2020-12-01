const app = new Vue({
  el: "#app",
  data: {
    url: "",
    slug: "",
    created: null,
    error: null,
    showSuccessModal: false,
  },
  methods: {
    async createUrl() {
      const { url, slug } = this;
      console.log(url, slug);
      fetch("/url", {
        method: "POST",
        body: JSON.stringify({ url, slug }),
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "error") {
            throw data;
          } else {
            this.error = null;
            this.created = data;
            this.showSuccessModal = true;
          }
        })
        .catch((err) => {
          this.created = null;
          this.error = err.message;
        });
    },
    closeSuccessModal() {
      this.showSuccessModal = false;
    },
  },
});
console.log(app.showSuccessModal);
