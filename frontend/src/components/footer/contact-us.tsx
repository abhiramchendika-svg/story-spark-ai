import { Link } from "react-router-dom";

const ContactUs = () => {
    return (
        <div className="min-h-screen bg-black text-white px-6 py-12"> <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-6">
                Contact Us
            </h1>

            <p className="text-lg text-gray-300 leading-8">
                Have questions, suggestions, or feedback? We'd love to hear from you.
            </p>

            <div className="mt-10 bg-zinc-900 p-6 rounded-2xl">
                <h2 className="text-2xl font-semibold mb-4 text-blue-400">
                    Get in Touch
                </h2>

                <ul className="space-y-2 text-gray-300">
                    <li>- Email: ronichandrasarkar@gmail.com</li>
                    <li>- GitHub: github.com/ronisarkarexe/story-spark-ai</li>
                    <li>- Open-source collaboration welcome</li>
                </ul>
            </div>
            <div>
                <br></br>
                <Link
                    to="/"
                    className="px-6 py-3 bg-blue-500 text-white font-semibold text-lg rounded-full shadow-md hover:bg-blue-600 transition"
                >
                    ⬅ Back to Home
                </Link>
            </div>
        </div>
        </div>

    );
};

export default ContactUs;
