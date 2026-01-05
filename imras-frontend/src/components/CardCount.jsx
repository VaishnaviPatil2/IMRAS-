const CardCount = ({ title, count }) => {
  return (
    <div className="bg-white shadow rounded-lg p-5 flex flex-col items-center justify-center">
      <p className="text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{count}</p>
    </div>
  );
};

export default CardCount;
