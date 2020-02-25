<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Psr\Log\LoggerInterface;
use App\Service\PDFHelper;

class DefaultController extends AbstractController
{
    private $pdfHelper;

    public function __construct(LoggerInterface $logger, PDFHelper $pdfHelper)
    {
        $this->logger = $logger;
        $this->pdfHelper = $pdfHelper;
    }

    public function index()
    {
        return $this->render('index.html.twig', [

        ]);
    }

    public function decryptPdf(Request $request)
    {
        $file = $request->files->get('pdf');  // This is a UploadedFile object created from $_FILES['pdf']
        if ($file) {
            $originalFilename = $file->getClientOriginalName();
            $result = $this->pdfHelper->decrypt($file);
            if (!$result) {
                throw new \Exception('Error decrypting file '.$originalFilename);
            }
        }

        clearstatcache(true, $file->getRealPath());
        $response = new BinaryFileResponse($file->getRealPath());

        return $response;
    }
}
